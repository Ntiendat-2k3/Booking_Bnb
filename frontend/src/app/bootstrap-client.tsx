"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { bootstrapAuth } from "@/store/authThunks";

export default function BootstrapClient() {
  const dispatch = useDispatch<any>();
  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);
  return null;
}
