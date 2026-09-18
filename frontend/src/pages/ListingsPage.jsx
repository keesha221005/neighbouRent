import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import api from "../api/axios";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORIES = [
  { name: "All",         icon: "✨" },
  { name: "Electronics", icon: "📷" },
  { name: "Furniture",   icon: "🛋️" },
  { name: "Tools",       icon: "🔧" },
  { name: "Sports",      icon: "🏸" },
  { name: "Vehicles",    icon: "🚲" },
  { name: "Clothing",    icon: "👕" },
  { name: "Books",       icon: "📚" },
  { name: "Other",       icon: "📦" },
];

function ItemCard({ item }) {
  const avgRating = item.avgRating;
  const firstImage = item.images?.[0];

  return (
    <Link
      to={`/items/${item.id}`}
      className="card-lift block bg-white rounded-2xl border border-gray-100 overflow-hidden group"
    >
      {/* Image */}
      <div className="h-40 bg-gradient-to-br from-violet-50 to-amber-50 relative overflow-hidden">
        {firstImage ? (
          <img
            src={item.images?.[0] || '/placeholder.png'}
            alt={item.title}
            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        )}

        {/* Category pill */}
        <span className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur text-[11px] font-semibold px-2.5 py-1 rounded-full text-[var(--color-ink)] shadow-sm font-display">
          {item.category}
        </span>

        {/* Distance badge */}
        {item.distanceKm !== undefined && (
          <span className="absolute top-2.5 right-2.5 bg-[var(--color-ink)] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            {item.distanceKm} km
          </span>
        )}

        {/* Price tag — floating bottom-left, Zepto-style */}
        <div className="absolute bottom-2.5 left-2.5 bg-[var(--color-sun)] rounded-xl px-2.5 py-1 shadow-md">
          <span className="font-mono-price font-bold text-sm text-[var(--color-ink)]">₹{item.pricePerDay}</span>
          <span className="font-mono-price text-[10px] text-[var(--color-ink)]/70">/day</span>
        </div>
      </div>

      {/* Details */}
      <div className="p-3.5">
        <h3 className="font-display font-bold text-[var(--color-ink)] text-[15px] leading-snug truncate group-hover:text-[var(--color-violet)] transition-colors">
          {item.title}
        </h3>
        <p className="text-gray-400 text-xs mt-0.5 truncate">📍 {item.address}</p>

        <div className="flex items-center justify-between mt-2.5">
          {avgRating ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)] bg-[var(--color-fresh-light)] px-2 py-0.5 rounded-full">
              <span className="text-[var(--color-fresh)]">★</span> {avgRating}
              <span className="text-gray-400 font-normal">({item.reviewCount})</span>
            </span>
          ) : (
            <span className="text-xs text-gray-300 font-medium">New listing</span>
          )}

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-[var(--color-violet-light)] rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--color-violet)]">
              {item.owner?.name?.[0]?.toUpperCase()}
            </div>
            {item.owner?.verified && <span className="text-[10px]">✓</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ListingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [filters, setFilters] = useState({
    category: "All",
    search: "",
    minPrice: "",
    maxPrice: "",
    radius: "10",
  });
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category !== "All") params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.radius = filters.radius;
      }
      const res = await api.get("/items", { params });
      setItems(res.data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, userLocation]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleGetLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        alert("Could not get your location. Please allow location access.");
        setLocationLoading(false);
      }
    );
  };

  const mapCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [12.9716, 77.5946];

  return (
    <div className="max-w-7xl mx-auto px-4 py-5">

      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)]">
          What do you need today?
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Borrow it from a neighbour, save the planet a little</p>
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search for drills, cameras, tents..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full bg-white border-2 border-gray-100 focus:border-[var(--color-violet)] rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium placeholder:text-gray-400 focus:outline-none transition-colors shadow-sm"
        />
      </div>

      {/* ── Category chip scroller ── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            onClick={() => setFilters({ ...filters, category: c.name })}
            className={`btn-bounce flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-display font-bold transition-colors ${
              filters.category === c.name
                ? "bg-[var(--color-ink)] text-white"
                : "bg-white text-[var(--color-ink)] border border-gray-100 hover:border-gray-300"
            }`}
          >
            <span>{c.icon}</span> {c.name}
          </button>
        ))}
      </div>

      {/* ── Secondary filter row ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Near me */}
        {userLocation ? (
          <div className="flex items-center gap-1.5 bg-[var(--color-fresh-light)] rounded-2xl pl-3 pr-1.5 py-1.5">
            <span className="text-xs font-bold text-[var(--color-fresh)]">📍 Near me</span>
            <select
              value={filters.radius}
              onChange={(e) => setFilters({ ...filters, radius: e.target.value })}
              className="bg-white border-none rounded-xl px-2 py-1 text-xs font-semibold focus:outline-none"
            >
              <option value="2">2 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
              <option value="50">50 km</option>
            </select>
            <button onClick={() => setUserLocation(null)} className="text-gray-400 hover:text-red-500 text-xs px-1.5">✕</button>
          </div>
        ) : (
          <button
            onClick={handleGetLocation}
            disabled={locationLoading}
            className="btn-bounce flex items-center gap-1.5 text-xs font-bold bg-white border border-gray-100 hover:border-[var(--color-violet)] text-[var(--color-ink)] px-3.5 py-2.5 rounded-2xl transition-colors disabled:opacity-50"
          >
            📍 {locationLoading ? "Locating..." : "Use my location"}
          </button>
        )}

        {/* More filters toggle */}
        <button
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className="btn-bounce flex items-center gap-1.5 text-xs font-bold bg-white border border-gray-100 hover:border-[var(--color-violet)] text-[var(--color-ink)] px-3.5 py-2.5 rounded-2xl transition-colors"
        >
          💸 Price range {showMoreFilters ? "▲" : "▼"}
        </button>

        {/* View toggle */}
        <div className="ml-auto flex bg-white border border-gray-100 rounded-2xl p-1 gap-1">
          <button onClick={() => setView("grid")}
            className={`btn-bounce px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${view === "grid" ? "bg-[var(--color-ink)] text-white" : "text-gray-400"}`}>
            ⊞ Grid
          </button>
          <button onClick={() => setView("map")}
            className={`btn-bounce px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${view === "map" ? "bg-[var(--color-ink)] text-white" : "text-gray-400"}`}>
            🗺 Map
          </button>
        </div>
      </div>

      {/* Expandable price range */}
      {showMoreFilters && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500">Price per day:</span>
          <input
            type="number"
            placeholder="Min ₹"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-24 font-mono-price focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]"
          />
          <span className="text-gray-300">—</span>
          <input
            type="number"
            placeholder="Max ₹"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-24 font-mono-price focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]"
          />
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-gray-400 font-medium mb-3">
        {loading ? "Finding items..." : `${items.length} item${items.length !== 1 ? "s" : ""} near you`}
      </p>

      {/* ── Grid View ── */}
      {view === "grid" && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-100" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-display font-bold text-[var(--color-ink)]">No items found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different category or widen your search radius</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {items.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          )}
        </>
      )}

      {/* ── Map View ── */}
      {view === "map" && (
        <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ height: "600px" }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            {items.map((item) => (
              <Marker key={item.id} position={[item.latitude, item.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-[var(--color-violet)] font-bold">₹{item.pricePerDay}/day</p>
                    <Link to={`/items/${item.id}`} className="text-blue-600 underline text-xs">View details →</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}