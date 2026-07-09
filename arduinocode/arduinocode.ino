#include <WiFi.h>
#include <HTTPClient.h>
#include <TFT_eSPI.h>
#include <SPI.h>
#include "DHT.h"

// Network & API Configuration
const char* ssid = "Kamar_H4"; 
const char* password = "";
// const String apiKey = "INUC4ZTEQWX4YOGR"; 

// Sensor Pins
#define DHTPIN 4
#define DHTTYPE DHT11
#define LDR_PIN 34
#define RCWL_PIN 15
#define MQ135_PIN 35

// HC-SR04 Pins
#define TRIG_PIN 12
#define ECHO_PIN 14

DHT dht(DHTPIN, DHTTYPE);
TFT_eSPI tft = TFT_eSPI(); 

unsigned long waktuTerakhir = 0;
const unsigned long jedaPengiriman = 20000;

void setup() {
  Serial.begin(115200);
  delay(1000); 
  Serial.println("\n\n--- ESP32 STARTING ---");
  
  dht.begin();
  Serial.println("DHT11 started");
  
  pinMode(LDR_PIN, INPUT);
  pinMode(RCWL_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  Serial.println("Pins initialized");

  Serial.println("Starting TFT...");
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2); // Menjaga ukuran teks agak besar
  Serial.println("TFT initialized");

  Serial.println("Connecting to WiFi: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int wifi_attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    wifi_attempts++;
    if(wifi_attempts > 20) {
       Serial.println("\nWiFi connect timeout! Rebooting...");
       ESP.restart(); 
    }
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void loop() {
  float suhu = dht.readTemperature();
  float kelembapan = dht.readHumidity();
  int cahaya = digitalRead(LDR_PIN);
  int kualitasUdara = analogRead(MQ135_PIN);

  // baca ultrasonik dlu buat dapet jarak
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 20000); 
  int jarak = (duration == 0) ? 0 : (duration * 0.034 / 2);

  // nah ini logicnya, rcwl itu tembus tembok jadi gampang false alarm
  // kita akalin pake ultrasonik. anggap ada orang kalo radar kedetek DAN jarak < 150cm
  int gerakRaw = digitalRead(RCWL_PIN);
  int gerak = 0;
  if (gerakRaw == 1 && jarak > 0 && jarak < 150) {
    gerak = 1;
  }

  // Manipulasi kursor kordinat piksel untuk TFT_eSPI
  tft.setCursor(10, 10);
  tft.print("Suhu: " + String(suhu) + " C    ");
  
  tft.setCursor(10, 40);
  tft.print(cahaya ? "Lampu: Dark     " : "Lampu: Bright   ");
  
  tft.setCursor(10, 70);
  tft.print("Jarak: " + String(jarak) + " cm   ");
  
  tft.setCursor(10, 100);
  tft.print(gerak ? "Status: Ada Orang  " : "Status: Kosong     ");
  
  tft.setCursor(10, 130);
  tft.print("Udara: " + String(kualitasUdara) + "      ");
  
  tft.setCursor(10, 160);
  tft.print("Lembap: " + String(kelembapan) + " %    ");

  Serial.println("\n[ DATA SENSOR ]");
  Serial.println("Suhu   : " + String(suhu) + " C");
  Serial.println("Lembap : " + String(kelembapan) + " %");
  Serial.println("Cahaya : " + String(cahaya ? "Gelap (Dark)" : "Terang (Bright)"));
  Serial.println("Jarak  : " + String(jarak) + " cm");
  Serial.println("Gerak  : " + String(gerak ? "Ada Orang!" : "Kosong"));
  Serial.println("Udara  : " + String(kualitasUdara) + " (ADC)");

  // if ((millis() - waktuTerakhir) > jedaPengiriman) {
  //   if (WiFi.status() == WL_CONNECTED) {
  //     HTTPClient http;
  //     String url = "http://api.thingspeak.com/update?api_key=" + apiKey +
  //                  "&field1=" + String(suhu) +
  //                  "&field2=" + String(cahaya) +
  //                  "&field3=" + String(jarak) +
  //                  "&field4=" + String(gerak) +
  //                  "&field5=" + String(kualitasUdara) +
  //                  "&field6=" + String(kelembapan);

      // http.begin(url);
      // int httpCode = http.GET(); 
      
      // if (httpCode > 0) {
      //   Serial.println("berhasil hit thingspeak, code: " + String(httpCode));
      // } else {
      //   Serial.println("error fetch data thingspeak: " + http.errorToString(httpCode));
      // }
      
  //     http.end();
  //   } else {
  //     Serial.println("wifi disconnect, ga bisa kirim data");
  //   }
  //   waktuTerakhir = millis();
  // }
  
  delay(1000); 
}