import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import api from "../api/axios";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORIES = [
  { name: "Electronics", icon: "📷" },
  { name: "Furniture",   icon: "🛋️" },
  { name: "Tools",       icon: "🔧" },
  { name: "Sports",      icon: "🏸" },
  { name: "Vehicles",    icon: "🚲" },
  { name: "Clothing",    icon: "👕" },
  { name: "Books",       icon: "📚" },
  { name: "Other",       icon: "📦" },
];

function LocationPicker({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng); } });
  return null;
}

// Section wrapper with step number
function Section({ step, title, subtitle, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 bg-[var(--color-violet)] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {step}
        </div>
        <div>
          <h2 className="font-display font-bold text-[var(--color-ink)] text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 font-medium">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// Input field with consistent styling
function Field({ label, optional, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
        {optional && <span className="text-gray-300 normal-case font-medium">— optional</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 font-medium mt-1.5">{hint}</p>}
    </div>
  );
}

const INPUT_CLASS = "w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--color-ink)] placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-violet)] transition-colors bg-[var(--color-bg)]";

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", category: "Electronics",
    pricePerDay: "", deposit: "", estimatedValue: "", address: "", images: "",
  });
  const [pin, setPin] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingUrl, setUploadingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleDetectLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPin({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          setForm((f) => ({ ...f, address: data.display_name || "" }));
        } catch { /* ignore */ }
        setLocationLoading(false);
      },
      () => {
        alert("Could not get location. Please click on the map to set it.");
        setLocationLoading(false);
      }
    );
  };

  const handleMapClick = async (latlng) => {
    setPin(latlng);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
      const data = await res.json();
      setForm((f) => ({ ...f, address: data.display_name || "" }));
    } catch { /* ignore */ }
  };

  const handleSuggestPrice = async () => {
    if (!form.title || !form.address) {
      alert("Please enter a title and select a location first.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post("/ai/suggest-price", {
        title: form.title, description: form.description,
        category: form.category, location: form.address,
      });
      setForm(prev => ({ ...prev, pricePerDay: res.data.suggestedPrice }));
    } catch {
      alert("Failed to suggest price. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!pin) return setError("Please set the item location on the map.");
    if (!form.title || !form.description || !form.pricePerDay)
      return setError("Title, description and price are required.");

    const images = form.images ? form.images.split(",").map(s => s.trim()).filter(Boolean) : [];
    setLoading(true);
    try {
      const res = await api.post("/items", {
        ...form,
        pricePerDay: parseFloat(form.pricePerDay),
        deposit: parseFloat(form.deposit || 0),
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        latitude: pin.lat, longitude: pin.lng, images,
      });
      navigate(`/items/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create listing.");
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = pin ? [pin.lat, pin.lng] : [12.9716, 77.5946];

  return (
    <div className="max-w-2xl mx-auto px-4 py-7">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)]">List an Item 📦</h1>
        <p className="text-gray-400 text-sm mt-1 font-medium">Fill in the details to start earning from things you own</p>
      </div>

      {error && (
        <div className="bg-[var(--color-coral-light)] text-[var(--color-coral)] px-4 py-3 rounded-2xl text-sm font-semibold mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Step 1: Basic Info ── */}
        <Section step="1" title="Basic Information" subtitle="What are you listing?">
          <div className="space-y-4">
            <Field label="Item Title" hint="Be specific — 'Canon EOS 1500D DSLR Camera' works better than 'Camera'">
              <input type="text" name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. Canon DSLR Camera, Power Drill, Camping Tent"
                required className={INPUT_CLASS} />
            </Field>

            <Field label="Category">
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.name} type="button"
                    onClick={() => setForm(f => ({ ...f, category: c.name }))}
                    className={`btn-bounce flex flex-col items-center gap-1 py-2.5 px-2 rounded-2xl border-2 text-xs font-bold transition-colors ${
                      form.category === c.name
                        ? "border-[var(--color-violet)] bg-[var(--color-violet-light)] text-[var(--color-violet)]"
                        : "border-gray-100 bg-[var(--color-bg)] text-gray-500 hover:border-gray-200"
                    }`}>
                    <span className="text-lg">{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Description" hint="Condition, what's included, any usage rules or restrictions">
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="Describe your item, its condition, what's included..."
                rows={3} required
                className={`${INPUT_CLASS} resize-none`} />
            </Field>
          </div>
        </Section>

        {/* ── Step 2: Pricing ── */}
        <Section step="2" title="Pricing" subtitle="Set your rental rates">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price per Day (₹)">
                <div className="relative">
                  <input type="number" name="pricePerDay" value={form.pricePerDay}
                    onChange={handleChange} placeholder="0" min="1" required
                    className={`${INPUT_CLASS} font-mono-price pr-20`} />
                  <button type="button" onClick={handleSuggestPrice} disabled={aiLoading}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--color-violet)] bg-[var(--color-violet-light)] px-2.5 py-1 rounded-xl disabled:opacity-50 whitespace-nowrap">
                    {aiLoading ? "..." : "✨ AI"}
                  </button>
                </div>
              </Field>
              <Field label="Security Deposit (₹)" optional>
                <input type="number" name="deposit" value={form.deposit}
                  onChange={handleChange} placeholder="0" min="0"
                  className={`${INPUT_CLASS} font-mono-price`} />
              </Field>
            </div>

            <Field label="Estimated New Price (₹)" optional
              hint="💡 Renters see how much they save vs buying — helps you get more bookings">
              <input type="number" name="estimatedValue" value={form.estimatedValue}
                onChange={handleChange} placeholder="e.g. 15000" min="0"
                className={`${INPUT_CLASS} font-mono-price`} />
            </Field>

            {/* Live savings preview */}
            {form.pricePerDay && form.estimatedValue && parseFloat(form.estimatedValue) > 0 && (
              <div className="bg-[var(--color-fresh-light)] rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-xs font-bold text-[var(--color-fresh)]">Renters save ₹{(parseFloat(form.estimatedValue) - parseFloat(form.pricePerDay || 0)).toLocaleString()} on a 1-day rental</p>
                  <p className="text-[10px] text-[var(--color-fresh)]/70 font-medium mt-0.5">This will be shown on their dashboard after the rental</p>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Step 3: Photos ── */}
        <Section step="3" title="Photos" subtitle="Good photos get 3x more bookings">
          <div className="space-y-3">
            {/* Upload from device */}
            <label className="btn-bounce flex items-center justify-center gap-3 w-full border-2 border-dashed border-gray-200 rounded-2xl px-4 py-5 text-sm font-bold text-gray-400 cursor-pointer hover:border-[var(--color-violet)] hover:text-[var(--color-violet)] hover:bg-[var(--color-violet-light)] transition-colors">
              <span className="text-xl">📁</span>
              <span>{uploadingFile ? "Uploading..." : "Click to upload from device"}</span>
              <input type="file" accept="image/*" className="hidden"
                disabled={uploadingFile || uploadingUrl}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploadingFile(true);
                  try {
                    const formData = new FormData();
                    formData.append("image", file);
                    const res = await api.post("/upload/file", formData, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                    setForm((f) => ({
                      ...f,
                      images: f.images ? f.images + "," + res.data.url : res.data.url,
                    }));
                  } catch {
                    setError("Image upload failed. Try again.");
                  } finally {
                    setUploadingFile(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>

            {/* URL input */}
            <div className="flex gap-2">
              <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Or paste an image URL..."
                className={`${INPUT_CLASS} flex-1`} />
              <button type="button" disabled={uploadingUrl || !urlInput.trim()}
                onClick={async () => {
                  setUploadingUrl(true);
                  try {
                    const res = await api.post("/upload/url", { url: urlInput.trim() });
                    setForm((f) => ({
                      ...f,
                      images: f.images ? f.images + "," + res.data.url : res.data.url,
                    }));
                    setUrlInput("");
                  } catch {
                    setError("Could not fetch that URL.");
                  } finally {
                    setUploadingUrl(false);
                  }
                }}
                className="btn-bounce bg-[var(--color-violet)] hover:bg-[var(--color-primary-dark)] disabled:opacity-40 text-white text-sm font-bold px-4 py-3 rounded-2xl transition-colors whitespace-nowrap">
                {uploadingUrl ? "..." : "Add"}
              </button>
            </div>

            {/* Image previews */}
            {form.images && (
              <div className="flex gap-2 flex-wrap">
                {form.images.split(",").map((url, i) => url.trim() ? (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={url.trim()} alt={`Preview ${i + 1}`}
                      className="h-24 w-24 object-cover rounded-2xl border-2 border-gray-100"
                      onError={(e) => { e.target.style.display = "none"; }} />
                    <button type="button"
                      onClick={() => {
                        const arr = form.images.split(",").map(s => s.trim()).filter((_, idx) => idx !== i);
                        setForm(f => ({ ...f, images: arr.join(",") }));
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-[var(--color-coral)] text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-md">
                      ×
                    </button>
                  </div>
                ) : null)}
              </div>
            )}
          </div>
        </Section>

        {/* ── Step 4: Location ── */}
        <Section step="4" title="Pickup Location" subtitle="Where can renters collect this item?">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {pin ? (
                <span className="text-xs font-bold text-[var(--color-fresh)] bg-[var(--color-fresh-light)] px-3 py-1.5 rounded-full">
                  ✓ Pin set
                </span>
              ) : (
                <span className="text-xs text-gray-400 font-medium">Click the map or use your location</span>
              )}
              <button type="button" onClick={handleDetectLocation} disabled={locationLoading}
                className="btn-bounce text-xs font-bold bg-[var(--color-violet-light)] hover:bg-[var(--color-violet)] hover:text-white text-[var(--color-violet)] px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50">
                {locationLoading ? "Detecting..." : "📍 Use my location"}
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border-2 border-gray-100" style={{ height: "240px" }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker onPick={handleMapClick} />
                {pin && <Marker position={[pin.lat, pin.lng]} />}
              </MapContainer>
            </div>

            <Field label="Address / Landmark" hint="Auto-filled when you click the map or detect location">
              <input type="text" name="address" value={form.address} onChange={handleChange}
                placeholder="e.g. Near Indiranagar Metro, Bengaluru"
                required className={INPUT_CLASS} />
            </Field>
          </div>
        </Section>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="btn-bounce w-full bg-[var(--color-violet)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-display font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-[var(--color-violet)]/20 text-base">
          {loading ? "Publishing..." : "Publish Listing 🚀"}
        </button>
      </form>
    </div>
  );
}