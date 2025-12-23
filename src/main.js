import { registerSW } from "virtual:pwa-register";
import { format, isBefore, isWeekend, parseISO, set } from "date-fns";
import { getForecast } from "./forecast";
import { getLocation } from "./location";
import "./style.css";
import Alpine from "alpinejs";

window.Alpine = Alpine;

// add this to the top of your main.js file
if ("serviceWorker" in navigator) {
  registerSW();
}

Alpine.store("theme", {
  init() {
    const setThemeColor = (isDark) => {
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
      document
        .querySelector('meta[name="theme-color"]')
        .setAttribute("content", isDark ? "#121212" : "#c6c6c6");
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setThemeColor(mediaQuery.matches);

    mediaQuery.addEventListener("change", (e) => {
      setThemeColor(e.matches);
    });
  },
});

Alpine.store("theme").init();

Alpine.data("weather", () => ({
  loading: false,
  error: null,
  allData: null,
  current: null,
  daily: null,
  dailyIndex: 0,
  amCommute: null,
  pmCommute: null,
  hourly: [],

  async init() {
    try {
      this.loading = true;

      const latitude = localStorage.getItem("latitude");
      const longitude = localStorage.getItem("longitude");

      if (latitude && longitude) {
        const parsedLatitude = parseFloat(latitude);
        const parsedLongitude = parseFloat(longitude);

        const data = await getForecast(parsedLatitude, parsedLongitude);
        this.allData = data;
        this.current = data.current;
        this.setDay(this.dailyIndex);
      } else {
        // no location set, redirect to settings
        window.location.href = "/settings.html";
      }
    } catch (e) {
      this.error = "Unable to retrieve weather data.";
      console.error(e);
    } finally {
      this.loading = false;
    }
  },

  setDay(index) {
    // don't let index go out of bounds
    if (index < 0 || index >= this.allData.daily.length) {
      return;
    }

    this.dailyIndex = index;
    this.daily = this.allData.daily[this.dailyIndex];

    const now = new Date();
    const selectedDate = parseISO(this.daily.date);

    const amCommuteTimeHour =
      parseInt(localStorage.getItem("amCommuteTime")) || 7;
    const amCommuteTime = set(selectedDate, {
      hours: amCommuteTimeHour,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    this.amCommute = /*isBefore(now, amCommuteTime) &&*/ !isWeekend(
      selectedDate,
    )
      ? this.allData.hourly.find((d) => {
          return d.time.getTime() === amCommuteTime.getTime();
        })
      : null;

    const pmCommuteTimeHour =
      parseInt(localStorage.getItem("pmCommuteTime")) || 17;
    const pmCommuteTime = set(selectedDate, {
      hours: pmCommuteTimeHour,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    this.pmCommute = /* isBefore(now, pmCommuteTime) && */ !isWeekend(
      selectedDate,
    )
      ? this.allData.hourly.find((d) => {
          return d.time.getTime() === pmCommuteTime.getTime();
        })
      : null;

    // hourly
    const isToday = this.dailyIndex === 0;
    const startIndex = isToday
      ? this.allData.hourly.findIndex((d) => {
          return d.time > now;
        })
      : this.dailyIndex * 24 + 6;
    const endIndex = startIndex + 24;
    this.hourly = this.allData.hourly.slice(startIndex, endIndex);

    this.$nextTick(() => (this.$refs.hourly.scrollLeft = 0));
  },

  nextDay() {
    this.setDay(this.dailyIndex + 1);
  },

  previousDay() {
    this.setDay(this.dailyIndex - 1);
  },

  formatTemperature(value) {
    return `${Math.round(value)}°`;
  },

  formatHumidity(value) {
    return `${Math.round(value)}%`;
  },

  formatWind(value) {
    return `${Math.round(value)} mph`;
  },

  formatLongDate(rawDate) {
    const date = parseISO(rawDate);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  },

  formatProbability(value) {
    return `${Math.round(value)}%`;
  },

  formatHour(date) {
    return date ? format(date, "haaa") : "";
  },
}));

Alpine.data("settings", () => ({
  latitude: null,
  longitude: null,
  amCommuteTime: null,
  pmCommuteTime: null,

  async init() {
    this.latitude = localStorage.getItem("latitude");
    this.longitude = localStorage.getItem("longitude");
    this.amCommuteTime = localStorage.getItem("amCommuteTime") || 7; // Default to 7 AM
    this.pmCommuteTime = localStorage.getItem("pmCommuteTime") || 17; // Default to 5 PM
  },

  async getLocation() {
    const location = await getLocation();
    this.latitude = location.latitude.toFixed(6);
    this.longitude = location.longitude.toFixed(6);
  },

  saveSettings() {
    localStorage.setItem("latitude", this.latitude);
    localStorage.setItem("longitude", this.longitude);
    localStorage.setItem("amCommuteTime", this.amCommuteTime);
    localStorage.setItem("pmCommuteTime", this.pmCommuteTime);

    window.location.href = "/";
  },
}));

Alpine.start();
