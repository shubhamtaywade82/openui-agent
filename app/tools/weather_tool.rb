# frozen_string_literal: true

# Current weather from Open-Meteo (free, keyless): geocode the city, then read current conditions
class WeatherTool < ApplicationTool
  description "Get the current weather for a city (live data from Open-Meteo)"

  param :city, type: :string, desc: "City name, e.g. Tokyo, Berlin, London"

  GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
  FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
  # WMO weather interpretation codes grouped into the words WeatherCard picks its icon from
  CONDITIONS = {
    [ 0 ] => "Clear", [ 1 ] => "Mostly clear", [ 2 ] => "Partly cloudy", [ 3 ] => "Cloudy",
    [ 45, 48 ] => "Fog", [ 51, 53, 55, 56, 57 ] => "Drizzle", [ 61, 63, 65, 66, 67 ] => "Rain",
    [ 71, 73, 75, 77, 85, 86 ] => "Snow", [ 80, 81, 82 ] => "Rain showers", [ 95, 96, 99 ] => "Thunderstorm"
  }.freeze

  def execute(city:)
    place = find_place(city)
    return error_result("City not found: #{city}") unless place

    current = current_conditions(place)
    return error_result("Weather service unavailable for #{place['name']}") unless current

    {
      city: place["name"], country: place["country"],
      temperature: current["temperature_2m"].round, condition: condition_for(current["weather_code"]),
      humidity: current["relative_humidity_2m"].round, wind: "#{current['wind_speed_10m'].round} km/h", unit: "°C"
    }
  end

  private

  def find_place(city)
    data = get_json(GEOCODE_URL, name: city.to_s.strip, count: 1, language: "en")
    data.is_a?(Hash) ? data["results"]&.first : nil
  end

  def current_conditions(place)
    data = get_json(FORECAST_URL, latitude: place["latitude"], longitude: place["longitude"],
                                  current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code")
    data.is_a?(Hash) ? data["current"] : nil
  end

  def condition_for(code)
    CONDITIONS.find { |codes, _| codes.include?(code) }&.last || "Cloudy"
  end
end
