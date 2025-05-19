"use client";

import { useEffect } from "react";
import { hydrateUserStore } from "@/stores/useUserStoree";

export default function StoreHydration() {
  useEffect(() => {
    // Hydrate store từ localStorage khi component mount
    hydrateUserStore();
  }, []);

  return null; // Component này không render gì cả
}