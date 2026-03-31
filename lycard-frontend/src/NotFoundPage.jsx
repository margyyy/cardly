import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center px-6">
      <p style={{ fontFamily: "Catamaran, sans-serif", fontWeight: 900, fontSize: "8rem", lineHeight: 1 }} className="text-black">
        "
      </p>
      <h1 className="font-head text-4xl tracking-tight -mt-4">404</h1>
      <p className="text-black/50 text-sm font-head">This page doesn't exist.</p>
      <button
        onClick={() => navigate("/")}
        className="border-2 border-black px-5 py-2 font-head text-xs uppercase tracking-widest bg-black text-white hover:bg-gray-800"
      >
        Go Home
      </button>
    </div>
  );
}
