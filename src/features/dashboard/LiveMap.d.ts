import type { ComponentType } from "react";
import type { Capacity, HailRequest } from "../../core/domain/types";

export interface LiveMapProps {
  latitude?: number;
  longitude?: number;
  hails: HailRequest[];
  unitNumber?: string;
  fill?: boolean;
  routeCoordinates?: Array<[number, number]>;
  routeSource?: "backend" | "fallback";
  viewportInsets?: { top: number; bottom: number };
  capacity?: Capacity;
  isOnBreak?: boolean;
  canOperate?: boolean;
  onHail?: (id: string, action: "accept" | "reject") => void | Promise<void>;
}

export const LiveMap: ComponentType<LiveMapProps>;
