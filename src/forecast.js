import { formatISO } from "date-fns";
import { fetchWeatherApi } from "openmeteo";

const getDate = (date) => formatISO(date, { representation: "date" });

const formatForecast = (weatherData) => {
  const current = {
    temperature: weatherData.current.temperature_2m,
    relativeHumidity: weatherData.current.relative_humidity_2m,
    temperatureApparent: weatherData.current.apparent_temperature,
    description: getDescriptionFromWeatherCode(
      weatherData.current.weather_code,
    ),
    windSpeed: weatherData.current.wind_speed_10m,
    uvIndex: weatherData.current.uv_index,
  };

  const daily = weatherData.daily.time.map((time, index) => {
    return {
      date: getDate(new Date(time)),
      temperatureMax: weatherData.daily.temperature_2m_max[index],
      temperatureMin: weatherData.daily.temperature_2m_min[index],
      apparentTemperatureMax: weatherData.daily.apparent_temperature_max[index],
      apparentTemperatureMin: weatherData.daily.apparent_temperature_min[index],
      windSpeedMax: weatherData.daily.wind_speed_10m_max[index],
      description: getDescriptionFromWeatherCode(
        weatherData.daily.weather_code[index],
      ),
      precipitationProbability:
        weatherData.daily.precipitation_probability_mean[index],
    };
  });

  const hourly = weatherData.hourly.time.map((time, index) => ({
    time,
    temperature: weatherData.hourly.temperature_2m[index],
    relativeHumidity: weatherData.hourly.relative_humidity_2m[index],
    temperatureApparent: weatherData.hourly.apparent_temperature[index],
    precipitationProbability:
      weatherData.hourly.precipitation_probability[index],
    precipitation: weatherData.hourly.precipitation[index],
    description: getDescriptionFromWeatherCode(
      weatherData.hourly.weather_code[index],
    ),
    icon: getIconFromWeatherCode(weatherData.hourly.weather_code[index]),
  }));

  return { current, hourly, daily };
};

// based on wmo codes
const getDescriptionFromWeatherCode = (code) => {
  const weatherCodes = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Heavy drizzle",
    56: "Light freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light rain showers",
    81: "Moderate rain showers",
    82: "Heavy rain showers",
    85: "Light snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with light hail",
    99: "Thunderstorm with heavy hail",
  };

  return weatherCodes[code];
};

const getIconFromWeatherCode = (code) => {
  switch (code) {
    case 0: // Clear sky
    case 1: // Mainly clear
      return "wi-day-sunny";
    case 2: // Partly cloudy
      return "wi-day-cloudy";
    case 3: // Overcast
      return "wi-day-sunny-overcast";
    case 45: // Fog
    case 48: // Depositing rime fog
      return "wi-fog";
    case 51: // Light drizzle
    case 53: // Moderate drizzle
      return "wi-sprinkle";
    case 55: // Heavy drizzle
      return "wi-showers";
    case 56: // Light freezing drizzle
    case 57: // Heavy freezing drizzle
      return "wi-rain-mix";
    case 61: // Light rain
    case 63: // Moderate rain
      return "wi-rain";
    case 65: // Heavy rain
      return "wi-rain-wind";
    case 66: // Light freezing rain
    case 67: // Heavy freezing rain
      return "wi-rain-mix";
    case 71: // Light snow
    case 73: // Moderate snow
    case 75: // Heavy snow
    case 77: // Snow grains
      return "wi-snow";
    case 80: // Light rain showers
    case 81: // Moderate rain showers
      return "wi-showers";
    case 82: // Heavy rain showers
      return "wi-rain-wind";
    case 85: // Light snow showers
    case 86: // Heavy snow showers
      return "wi-snow";
    case 95: // Thunderstorm
      return "wi-thunderstorm";
    case 96: // Thunderstorm with light hail
    case 99: // Thunderstorm with heavy hail
      return "wi-hail";
    default:
      return "wi-na";
  }

  return weatherCodes[code];
};
const fetchForecast = async (latitude, longitude) => {
  const params = {
    latitude,
    longitude,
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "wind_speed_10m_max",
      "precipitation_probability_mean",
    ],
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
    ],
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "uv_index"
    ],
    timezone: "America/New_York", // TODO parameterize timezone based on location
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
  };
  const url = "https://api.open-meteo.com/v1/forecast";
  const responses = await fetchWeatherApi(url, params);

  // Process first location. Add a for-loop for multiple locations or weather models
  const response = responses[0];

  const current = response.current();
  const hourly = response.hourly();
  const daily = response.daily();

  // Note: The order of weather variables in the URL query and the indices below need to match
  const weatherData = {
    current: {
      time: new Date(Number(current.time()) * 1000),
      temperature_2m: current.variables(0).value(),
      relative_humidity_2m: current.variables(1).value(),
      apparent_temperature: current.variables(2).value(),
      weather_code: current.variables(3).value(),
      wind_speed_10m: current.variables(4).value(),
      uv_index: current.variables(5).value(),
    },
    hourly: {
      time: Array.from(
        {
          length:
            (Number(hourly.timeEnd()) - Number(hourly.time())) /
            hourly.interval(),
        },
        (_, i) =>
          new Date((Number(hourly.time()) + i * hourly.interval()) * 1000),
      ),
      temperature_2m: hourly.variables(0).valuesArray(),
      relative_humidity_2m: hourly.variables(1).valuesArray(),
      apparent_temperature: hourly.variables(2).valuesArray(),
      precipitation_probability: hourly.variables(3).valuesArray(),
      precipitation: hourly.variables(4).valuesArray(),
      weather_code: hourly.variables(5).valuesArray(),
    },
    daily: {
      time: Array.from(
        {
          length:
            (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval(),
        },
        (_, i) =>
          new Date((Number(daily.time()) + i * daily.interval()) * 1000),
      ),
      weather_code: daily.variables(0).valuesArray(),
      temperature_2m_max: daily.variables(1).valuesArray(),
      temperature_2m_min: daily.variables(2).valuesArray(),
      apparent_temperature_max: daily.variables(3).valuesArray(),
      apparent_temperature_min: daily.variables(4).valuesArray(),
      wind_speed_10m_max: daily.variables(5).valuesArray(),
      precipitation_probability_mean: daily.variables(6).valuesArray(),
    },
  };

  return weatherData;
};

function getFromCache(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const parsed = JSON.parse(cached);

  const now = Date.now();
  if (now - parsed.timestamp > 15 * 60 * 1000) {
    // Cache valid for 15 minutes
    localStorage.removeItem(key);
    return null;
  }

  const parsedDates = {
    ...parsed.data,
    hourly: parsed.data.hourly.map((h) => ({
      ...h,
      time: new Date(h.time),
    })),
  };

  return parsedDates;
}

function setInCache(key, data) {
  const toCache = {
    timestamp: Date.now(),
    data,
  };
  localStorage.setItem(key, JSON.stringify(toCache));
}

function generateCacheKey(latitude, longitude) {
  return `forecast_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
}

export async function getForecast(latitude, longitude) {
  const cacheKey = generateCacheKey(latitude, longitude);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const weatherData = await fetchForecast(latitude, longitude);
  const formatted = formatForecast(weatherData);
  setInCache(cacheKey, formatted);
  return formatted;
}
