const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all weather routes
router.use(auth);

// GET / - get current weather and 5-day forecast
router.get('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    // Get location config from settings
    let lat = '36.1699';  // Default: Las Vegas
    let lon = '-115.1398';
    let units = 'imperial';

    try {
      const settingsResult = await pool.query(
        "SELECT value FROM settings WHERE key = 'weather_config'"
      );
      if (settingsResult.rows.length > 0) {
        const config = settingsResult.rows[0].value;
        if (config.lat) lat = config.lat;
        if (config.lon) lon = config.lon;
        if (config.units) units = config.units;
      }
    } catch (settingsErr) {
      console.error('Error reading weather settings, using defaults:', settingsErr.message);
    }

    // If no API key, return mock data
    if (!apiKey) {
      return res.json({
        source: 'mock',
        current: {
          temp: 75,
          feels_like: 73,
          humidity: 20,
          description: 'Clear sky',
          icon: '01d',
          wind_speed: 8,
          city: 'Las Vegas'
        },
        forecast: [
          { date: '2026-02-17', high: 75, low: 52, description: 'Clear sky', icon: '01d' },
          { date: '2026-02-18', high: 72, low: 50, description: 'Few clouds', icon: '02d' },
          { date: '2026-02-19', high: 68, low: 48, description: 'Scattered clouds', icon: '03d' },
          { date: '2026-02-20', high: 70, low: 49, description: 'Clear sky', icon: '01d' },
          { date: '2026-02-21', high: 74, low: 51, description: 'Clear sky', icon: '01d' }
        ]
      });
    }

    // Fetch current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
    const currentResponse = await fetch(currentUrl);

    if (!currentResponse.ok) {
      throw new Error(`OpenWeatherMap current weather API error: ${currentResponse.status}`);
    }

    const currentData = await currentResponse.json();

    // Fetch 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
    const forecastResponse = await fetch(forecastUrl);

    if (!forecastResponse.ok) {
      throw new Error(`OpenWeatherMap forecast API error: ${forecastResponse.status}`);
    }

    const forecastData = await forecastResponse.json();

    // Process forecast into daily summaries
    const dailyMap = {};
    for (const item of forecastData.list) {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = {
          date,
          high: item.main.temp_max,
          low: item.main.temp_min,
          description: item.weather[0].description,
          icon: item.weather[0].icon
        };
      } else {
        if (item.main.temp_max > dailyMap[date].high) dailyMap[date].high = item.main.temp_max;
        if (item.main.temp_min < dailyMap[date].low) dailyMap[date].low = item.main.temp_min;
      }
    }

    const forecast = Object.values(dailyMap).slice(0, 5);

    res.json({
      source: 'openweathermap',
      current: {
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        humidity: currentData.main.humidity,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        wind_speed: currentData.wind.speed,
        city: currentData.name
      },
      forecast
    });
  } catch (error) {
    console.error('Get weather error:', error);
    res.status(500).json({ message: 'Server error fetching weather data' });
  }
});

// GET /config - get weather location config from settings
router.get('/config', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM settings WHERE key = 'weather_config'"
    );

    if (result.rows.length === 0) {
      return res.json({
        config: {
          lat: '36.1699',
          lon: '-115.1398',
          units: 'imperial',
          city: 'Las Vegas'
        }
      });
    }

    res.json({ config: result.rows[0].value });
  } catch (error) {
    console.error('Get weather config error:', error);
    res.status(500).json({ message: 'Server error fetching weather config' });
  }
});

module.exports = router;
