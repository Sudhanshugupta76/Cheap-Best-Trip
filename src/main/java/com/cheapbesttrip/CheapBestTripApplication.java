package com.cheapbesttrip;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@SpringBootApplication
public class CheapBestTripApplication {
    public static void main(String[] args) {
        SpringApplication.run(CheapBestTripApplication.class, args);
    }

    @Controller
    static class HomeController {
        @GetMapping("/")
        String home() {
            return "forward:/index.html";
        }
    }
}
