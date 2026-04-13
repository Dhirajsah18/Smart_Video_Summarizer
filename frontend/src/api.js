import axios from "axios";

const resolvedBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: resolvedBaseUrl,
});

export default api;
