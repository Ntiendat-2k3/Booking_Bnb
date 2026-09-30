import { createElement } from "react";
import {
  Barbell,
  Car,
  CookingPot,
  Laptop,
  PawPrint,
  Snowflake,
  Sparkle,
  SwimmingPool,
  Television,
  WashingMachine,
  WifiHigh,
} from "@phosphor-icons/react/dist/ssr";

const ICONS = new Map([
  ["wifi", WifiHigh],
  ["kitchen", CookingPot],
  ["aircon", Snowflake],
  ["washer", WashingMachine],
  ["workspace", Laptop],
  ["pool", SwimmingPool],
  ["gym", Barbell],
  ["parking", Car],
  ["tv", Television],
  ["pet", PawPrint],
]);

const NAME_TO_SLUG = new Map([
  ["bếp", "kitchen"],
  ["điều hoà", "aircon"],
  ["điều hòa", "aircon"],
  ["máy giặt", "washer"],
  ["chỗ làm việc", "workspace"],
  ["bàn làm việc", "workspace"],
  ["hồ bơi", "pool"],
  ["phòng gym", "gym"],
  ["chỗ đậu xe", "parking"],
  ["chỗ đỗ xe", "parking"],
  ["cho phép thú cưng", "pet"],
]);

/** Trang chi tiết không nhận slug từ API nên tra tên tiện ích khi cần. */
export default function AmenityIcon({ amenity, size = 20, className }) {
  const name = amenity?.name?.trim().toLocaleLowerCase("vi");
  const Icon = ICONS.get(amenity?.slug) || ICONS.get(NAME_TO_SLUG.get(name) || name) || Sparkle;
  return createElement(Icon, { "aria-hidden": true, size, className });
}
