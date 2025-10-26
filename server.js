const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) { 
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Forecast endpoint - handles both city names and coordinates
app.get('/api/forecast', (req, res) => {
  const { city, days = 3, lat, lon } = req.query;
  
  if (!city && !(lat && lon)) {
    return res.status(400).json({ error: 'Either city name or coordinates (lat, lon) are required' });
  }

  // Build the query parameter - either city name or coordinates
  let queryParam;
  if (city) {
    queryParam = city;
  } else {
    queryParam = `${lat},${lon}`;
  }

  axios.get(
    `http://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHER_API_KEY}&q=${queryParam}&days=${days}&aqi=no`
  )
  .then(response => {
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
  })
  .catch(error => {
    console.error('Forecast API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'Invalid API key' });
    }
    
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});