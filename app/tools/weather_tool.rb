class WeatherTool < RubyLLM::Tool
  description "Get the current weather for a city"

  param :city, type: :string, desc: "City name, e.g. Tokyo, Berlin, London"

  def execute(city:)
    {
      city: city.to_s.titleize,
      temperature: rand(6..34),
      condition: [ "Sunny", "Partly cloudy", "Cloudy", "Light rain", "Clear" ].sample,
      humidity: rand(30..95),
      wind: "#{rand(4..28)} km/h",
      unit: "°C"
    }
  end
end
