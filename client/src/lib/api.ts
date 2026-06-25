const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function request(endpoint: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

// Auth
export const login = (username: string, pin: string) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, pin }),
  });

export const register = (formData: FormData) =>
  request("/auth/register", { method: "POST", body: formData });

export const getProfile = () => request("/auth/profile");

export const updateProfile = (formData: FormData) =>
  request("/auth/profile", { method: "PATCH", body: formData });

export const changePin = (currentPin: string, newPin: string) =>
  request("/auth/pin", {
    method: "PATCH",
    body: JSON.stringify({ currentPin, newPin }),
  });

// Requests
export const getSellers = () => request("/requests/sellers");

export const createRequest = (formData: FormData) =>
  request("/requests", { method: "POST", body: formData });

export const getRequests = () => request("/requests");

export const getRequest = (id: string) => request(`/requests/${id}`);

export const setPrice = (id: string, price: number) =>
  request(`/requests/${id}/price`, {
    method: "PATCH",
    body: JSON.stringify({ price }),
  });

export const markUnavailable = (id: string) =>
  request(`/requests/${id}/unavailable`, { method: "PATCH" });

export const acceptPrice = (id: string) =>
  request(`/requests/${id}/accept`, { method: "PATCH" });

export const rejectPrice = (id: string) =>
  request(`/requests/${id}/reject`, { method: "PATCH" });

// Orders
export const getOrders = () => request("/orders");

export const getOrderStats = () => request("/orders/stats");

// Admin
export const getAdminUsers = () => request("/admin/users");
export const getAdminStats = () => request("/admin/stats");
