package com.cheapbesttrip;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
public class TripApiController {
    private static final Logger logger = LoggerFactory.getLogger(TripApiController.class);
    private static final Pattern PNR_PATTERN = Pattern.compile("[0-9]{10}");
    private static final Pattern TRAIN_NUMBER_PATTERN = Pattern.compile("[0-9]{1,5}");
    private static final Pattern JOURNEY_DATE_PATTERN = Pattern.compile("[0-9]{4}-[0-9]{2}-[0-9]{2}");
    private static final Pattern STATION_PATTERN = Pattern.compile("[A-Z]{2,6}");
    private static final Pattern QUOTA_PATTERN = Pattern.compile("[A-Z]{2,10}");

    private final ObjectMapper objectMapper;
    private final TripDataStore dataStore;
    private final HttpClient httpClient;
    private final String railwayApiKey;
    private final String railwayApiRoute;
    private final String paymentMode;

    public TripApiController(
            ObjectMapper objectMapper,
            @Value("${INDIAN_RAIL_API_KEY:}") String railwayApiKey,
            @Value("${INDIAN_RAIL_API_ROUTE:1}") String railwayApiRoute,
            @Value("${PAYMENT_MODE:demo}") String paymentMode) {
        this.objectMapper = objectMapper;
        this.dataStore = new TripDataStore(objectMapper, Path.of("trip-data.json"));
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        this.railwayApiKey = railwayApiKey;
        this.railwayApiRoute = railwayApiRoute;
        this.paymentMode = paymentMode;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of(
                "ok", true,
                "database", "json-file",
                "railwayApiConfigured", !railwayApiKey.isBlank(),
                "paymentMode", paymentMode);
    }

    @GetMapping("/api/railway/pnr")
    public ResponseEntity<?> checkPnr(@RequestParam(defaultValue = "") String pnr) {
        String value = pnr.trim();
        if (!PNR_PATTERN.matcher(value).matches()) {
            return error(400, "PNR must contain exactly 10 digits.");
        }
        if (railwayApiKey.isBlank()) {
            return error(503, "IndianRailAPI key is not configured on the server.");
        }

        String url = "https://indianrailapi.com/api/v2/PNRCheck/apikey/"
                + encodePathSegment(railwayApiKey) + "/PNRNumber/" + value + "/Route/"
                + encodePathSegment(railwayApiRoute) + "/";
        return callRailwayProvider(url, "pnr_checks", Map.of("pnr", value));
    }

    @GetMapping("/api/railway/running")
    public ResponseEntity<?> runningStatus(
            @RequestParam(defaultValue = "") String trainNumber,
            @RequestParam(defaultValue = "") String date) {
        String number = trainNumber.trim();
        String journeyDate = date.trim();
        if (!TRAIN_NUMBER_PATTERN.matcher(number).matches()
                || !JOURNEY_DATE_PATTERN.matcher(journeyDate).matches()) {
            return error(400, "Valid train number and journey date are required.");
        }
        if (railwayApiKey.isBlank()) {
            return error(503, "IndianRailAPI key is not configured on the server.");
        }

        String url = "https://indianrailapi.com/api/v2/livetrainstatus/apikey/"
                + encodePathSegment(railwayApiKey) + "/trainnumber/" + encodePathSegment(number)
                + "/date/" + journeyDate.replace("-", "") + "/";
        ResponseEntity<?> response = callRailwayProvider(url, "running_checks", Map.of(
                "train_number", number,
                "journey_date", journeyDate));
        if (!response.getStatusCode().is2xxSuccessful() || !(response.getBody() instanceof JsonNode data)) {
            return response;
        }
        return ResponseEntity.ok(normalizeRunningStatus(data, number, journeyDate));
    }

    @GetMapping("/api/railway/fare")
    public ResponseEntity<?> fare(
            @RequestParam(defaultValue = "") String trainNumber,
            @RequestParam(name = "from", defaultValue = "") String stationFrom,
            @RequestParam(name = "to", defaultValue = "") String stationTo,
            @RequestParam(defaultValue = "GN") String quota) {
        String number = trainNumber.trim();
        String from = stationFrom.trim().toUpperCase(Locale.ROOT);
        String to = stationTo.trim().toUpperCase(Locale.ROOT);
        String bookingQuota = quota.trim().toUpperCase(Locale.ROOT);
        if (!TRAIN_NUMBER_PATTERN.matcher(number).matches()
                || !STATION_PATTERN.matcher(from).matches()
                || !STATION_PATTERN.matcher(to).matches()
                || !QUOTA_PATTERN.matcher(bookingQuota).matches()) {
            return error(400, "Valid train number, station codes and quota are required.");
        }
        if (railwayApiKey.isBlank()) {
            return error(503, "IndianRailAPI key is not configured on the server.");
        }

        String url = "https://indianrailapi.com/api/v2/TrainFare/apikey/"
                + encodePathSegment(railwayApiKey) + "/TrainNumber/" + encodePathSegment(number)
                + "/From/" + encodePathSegment(from) + "/To/" + encodePathSegment(to)
                + "/Quota/" + encodePathSegment(bookingQuota);
        return callRailwayProvider(url, "fare_checks", Map.of(
                "train_number", number,
                "station_from", from,
                "station_to", to,
                "quota", bookingQuota));
    }

    @PostMapping("/api/bookings")
    public ResponseEntity<?> saveBooking(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> request = body == null ? Map.of() : body;
        Object ticketNumber = request.get("ticketNumber");
        Object bookingType = request.get("bookingType");
        Object passengerName = request.get("passengerName");
        Object route = request.get("route");
        if (isMissing(ticketNumber) || isMissing(bookingType)
                || isMissing(passengerName) || isMissing(route)) {
            return error(400, "ticketNumber, bookingType, passengerName and route are required.");
        }

        Map<String, Object> booking = new LinkedHashMap<>(request);
        booking.keySet().removeAll(List.of("ticketNumber", "bookingType", "passengerName", "route"));
        boolean saved = dataStore.saveBooking(
                ticketNumber, bookingType, passengerName, route, booking);
        if (!saved) {
            return error(409, "Booking already exists or could not be saved.");
        }
        return ResponseEntity.status(201).body(Map.of("saved", true, "ticketNumber", ticketNumber));
    }

    @GetMapping("/api/bookings/{ticketNumber}")
    public ResponseEntity<?> getBooking(@PathVariable String ticketNumber) {
        ObjectNode row = dataStore.findBooking(ticketNumber);
        if (row == null) {
            return error(404, "Booking not found.");
        }
        ObjectNode result = row.deepCopy();
        result.set("booking", row.get("booking_json"));
        return ResponseEntity.ok(result);
    }

    private ResponseEntity<?> callRailwayProvider(
            String url, String collection, Map<String, Object> record) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode data = objectMapper.readTree(response.body());
            Map<String, Object> storedRecord = new LinkedHashMap<>(record);
            storedRecord.put("response_json", data);
            dataStore.addRecord(collection, storedRecord);
            return ResponseEntity.status(response.statusCode()).body(data);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            logger.error("Railway provider request was interrupted.", exception);
            return error(502, "Railway provider request failed. Check API key, network access and provider availability.");
        } catch (IOException | IllegalArgumentException exception) {
            logger.error("Railway provider request failed.", exception);
            return error(502, "Railway provider request failed. Check API key, network access and provider availability.");
        }
    }

    private Map<String, Object> normalizeRunningStatus(JsonNode data, String trainNumber, String journeyDate) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trainNumber", findProviderValue(data, List.of("TrainNumber", "train_number", "TrainNo"), trainNumber));
        result.put("trainName", findProviderValue(data, List.of("TrainName", "train_name"), ""));
        result.put("status", findProviderValue(data, List.of("Status", "TrainStatus", "CurrentStatus", "Message"), "Running status received"));
        result.put("currentStation", findProviderValue(data, List.of("CurrentStation", "CurrentStationName", "StationName", "Location"), ""));
        result.put("currentStationCode", findProviderValue(data, List.of("CurrentStationCode", "StationCode"), ""));
        result.put("delay", findProviderValue(data, List.of("Delay", "DelayInMinutes", "LateBy", "LateMinutes"), ""));
        result.put("lastUpdated", findProviderValue(data, List.of("LastUpdated", "UpdatedAt", "UpdateTime", "Time"), ""));
        result.put("journeyDate", journeyDate);
        result.put("raw", data);
        return result;
    }

    private static String findProviderValue(JsonNode value, List<String> names, String fallback) {
        if (value == null || !value.isContainerNode()) {
            return fallback;
        }
        if (value.isObject()) {
            var fields = value.fields();
            List<Map.Entry<String, JsonNode>> entries = new java.util.ArrayList<>();
            while (fields.hasNext()) {
                entries.add(fields.next());
            }
            for (Map.Entry<String, JsonNode> entry : entries) {
                boolean wanted = names.stream().anyMatch(name -> name.equalsIgnoreCase(entry.getKey()));
                JsonNode match = entry.getValue();
                if (wanted && (match.isTextual() || match.isNumber())) {
                    return match.asText();
                }
            }
            for (Map.Entry<String, JsonNode> entry : entries) {
                String match = findProviderValue(entry.getValue(), names, "");
                if (!match.isEmpty()) {
                    return match;
                }
            }
        } else if (value.isArray()) {
            for (JsonNode entry : value) {
                String match = findProviderValue(entry, names, "");
                if (!match.isEmpty()) {
                    return match;
                }
            }
        }
        return fallback;
    }

    private static boolean isMissing(Object value) {
        return value == null || value instanceof String text && text.isBlank();
    }

    private static String encodePathSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static ResponseEntity<Map<String, String>> error(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }

    private static final class TripDataStore {
        private final ObjectMapper objectMapper;
        private final Path databasePath;
        private final ObjectNode database;

        private TripDataStore(ObjectMapper objectMapper, Path databasePath) {
            this.objectMapper = objectMapper;
            this.databasePath = databasePath;
            this.database = loadDatabase();
        }

        private ObjectNode loadDatabase() {
            if (!Files.exists(databasePath)) {
                return emptyDatabase();
            }
            try {
                JsonNode saved = objectMapper.readTree(databasePath.toFile());
                if (saved == null || !saved.isObject()) {
                    throw new IOException("Trip database must contain a JSON object.");
                }
                ObjectNode loaded = (ObjectNode) saved;
                for (String collection : List.of("pnr_checks", "running_checks", "fare_checks", "bookings")) {
                    if (!loaded.has(collection)) {
                        loaded.set(collection, objectMapper.createArrayNode());
                    } else if (!loaded.get(collection).isArray()) {
                        throw new IOException("Trip database collection must be an array: " + collection);
                    }
                }
                return loaded;
            } catch (IOException exception) {
                throw new IllegalStateException("Could not read trip-data.json.", exception);
            }
        }

        private ObjectNode emptyDatabase() {
            ObjectNode empty = objectMapper.createObjectNode();
            empty.set("pnr_checks", objectMapper.createArrayNode());
            empty.set("running_checks", objectMapper.createArrayNode());
            empty.set("fare_checks", objectMapper.createArrayNode());
            empty.set("bookings", objectMapper.createArrayNode());
            return empty;
        }

        private synchronized void addRecord(String collection, Map<String, Object> record) {
            ArrayNode records = (ArrayNode) database.get(collection);
            ObjectNode item = objectMapper.valueToTree(record);
            item.put("id", records.size() + 1);
            item.put("checked_at", Instant.now().toString());
            records.add(item);
            saveDatabase();
        }

        private synchronized boolean saveBooking(
                Object ticketNumber, Object bookingType, Object passengerName, Object route,
                Map<String, Object> booking) {
            ArrayNode bookings = (ArrayNode) database.get("bookings");
            for (JsonNode existing : bookings) {
                if (existing.path("ticket_number").asText().equals(String.valueOf(ticketNumber))) {
                    return false;
                }
            }
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("ticket_number", ticketNumber);
            record.put("booking_type", bookingType);
            record.put("passenger_name", passengerName);
            record.put("route", route);
            record.put("booking_json", booking);
            addRecord("bookings", record);
            return true;
        }

        private synchronized ObjectNode findBooking(String ticketNumber) {
            ArrayNode bookings = (ArrayNode) database.get("bookings");
            for (JsonNode row : bookings) {
                if (row.path("ticket_number").asText().equals(ticketNumber)) {
                    return (ObjectNode) row;
                }
            }
            return null;
        }

        private void saveDatabase() {
            try {
                Files.writeString(databasePath, objectMapper.writerWithDefaultPrettyPrinter()
                        .writeValueAsString(database), StandardCharsets.UTF_8);
            } catch (IOException exception) {
                throw new IllegalStateException("Could not save trip-data.json.", exception);
            }
        }
    }
}
