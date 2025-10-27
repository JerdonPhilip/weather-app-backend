const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Fixed CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://jerdonphilip.github.io",
    "https://jerdonphilip.github.io/app-weather"
  ],
  credentials: true
}));

app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Forecast endpoint - handles both city names and coordinates
app.get('/api/forecast', async (req, res) => {
  try {
    const { city, days = 3, lat, lon } = req.query;
    
    // Validate API key
    if (!process.env.WEATHER_API_KEY) {
      console.error('WEATHER_API_KEY is missing from environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    if (!city && !(lat && lon)) {
      return res.status(400).json({ 
        error: 'Either city name or coordinates (lat, lon) are required' 
      });
    }

    // Build the query parameter - either city name or coordinates
    let queryParam;
    if (city) {
      queryParam = encodeURIComponent(city);
    } else {
      queryParam = `${lat},${lon}`;
    }

    console.log(`Fetching forecast for: ${queryParam}, days: ${days}`);

    const response = await axios.get(
      `http://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHER_API_KEY}&q=${queryParam}&days=${days}&aqi=no`
    );

    // Current weather data
    const currentData = {
      location: response.data.location.name,
      country: response.data.location.country,
      temperature: response.data.current.temp_c,
      condition: response.data.current.condition.text,
      icon: response.data.current.condition.icon,
      humidity: response.data.current.humidity,
      windSpeed: response.data.current.wind_kph,
      feelsLike: response.data.current.feelslike_c,
      lastUpdated: response.data.current.last_updated
    };

    // Forecast data for next days
    const forecastData = response.data.forecast.forecastday.map(day => ({
      date: day.date,
      maxTemp: day.day.maxtemp_c,
      minTemp: day.day.mintemp_c,
      condition: day.day.condition.text,
      icon: day.day.condition.icon,
      humidity: day.day.avghumidity,
      windSpeed: day.day.maxwind_kph,
      sunrise: day.astro.sunrise,
      sunset: day.astro.sunset
    }));

    const forecastResponse = {
      current: currentData,
      forecast: forecastData,
      location: response.data.location
    };

    res.json(forecastResponse);
    
  } catch (error) {
    console.error('Forecast API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'Invalid API key' });
    }
    if (error.response?.status === 403) {
      return res.status(500).json({ error: 'API key unauthorized or exceeded quota' });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch forecast data',
      details: error.message 
    });
  }
});

// Health check endpoint with API key verification
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'Server is running',
    port: PORT,
    apiKeyConfigured: !!process.env.WEATHER_API_KEY,
    timestamp: new Date().toISOString()
  };
  res.json(healthStatus);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: localhost:3000, jerdonphilip.github.io`);
});