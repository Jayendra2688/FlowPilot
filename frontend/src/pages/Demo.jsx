import { useState } from "react";

export default function Demo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="mb-4 px-4 py-2 bg-black text-white"
      >
        Toggle
      </button>

      <div
        className={`transform transition-transform duration-[0.6s]
        ${open ? "translate-x-0" : "translate-x-full"}`}
      > 
        Hello
      </div>
    </>
  );
}
