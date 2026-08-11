import type { ComponentType } from "react";
import type { HailRequest } from "../../core/domain/types";

export interface LiveMapProps {
  latitude?: number;
  longitude?: number;
  hails: HailRequest[];
  unitNumber?: string;
  fill?: boolean;
  routeCoordinates?: Array<[number, number]>;
}

export const LiveMap: ComponentType<LiveMapProps>;
