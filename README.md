# Cheap & Best Trip

Cheap & Best Trip is a travel-planning website with a Java 17 and Spring Boot backend. It includes a travel homepage, holiday packages, visa procedure guides, and railway tools for PNR and live train status.

## Features

- Browse holiday package ideas and destination visa guides.
- Check PNR status and live train running status through the configured IndianRailAPI provider.
- Use backend endpoints for railway fare checks and booking records.
- Store booking and railway-check data in a local `trip-data.json` file.

## Requirements

- Java 17 or later
- Maven 3.6 or later

## Run locally

From the project directory, start the application with:

```powershell
mvn spring-boot:run
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The server port defaults to `3000` and can be changed with the `PORT` environment variable.

To build and run the packaged application:

```powershell
mvn clean package
java -jar target/cheap-best-trip-1.0.0.jar
```

## Configuration

Railway status and fare lookups require an IndianRailAPI key. Configure it using environment variables or a `.env` file in the project directory:

```properties
INDIAN_RAIL_API_KEY=your_api_key
INDIAN_RAIL_API_ROUTE=1
PAYMENT_MODE=demo
```

`INDIAN_RAIL_API_KEY` is empty by default, `INDIAN_RAIL_API_ROUTE` defaults to `1`, and `PAYMENT_MODE` defaults to `demo`. Do not commit real API keys or other secrets.

## Pages

- `/` — travel homepage
- `/holidays.html` — holiday package ideas
- `/tourism.html` — visa procedure guides
- `/pnr.html` — PNR status lookup
- `/running-status.html` — live train running status

## API endpoints

- `GET /api/health` — backend status and configuration
- `GET /api/railway/pnr?pnr={10-digit-number}` — PNR lookup
- `GET /api/railway/running?trainNumber={number}&date={YYYY-MM-DD}` — live running status
- `GET /api/railway/fare?trainNumber={number}&from={station-code}&to={station-code}&quota={quota}` — fare lookup
- `POST /api/bookings` — save a booking record
- `GET /api/bookings/{ticketNumber}` — retrieve a booking record

Booking and railway-check records are stored in the local `trip-data.json` file.
