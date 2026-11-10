import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Native rendering of assets/minibus-front.svg, used by the web unit list. */
export function MinibusFrontIcon({ size = 36, available = true }: { size?: number; available?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 20 20" accessible={false} opacity={available ? 1 : 0.4}>
    <Rect x="6" y=".6" width="8" height="1.8" rx=".7" fill="#eef3fa" stroke="#0b3d91" strokeWidth=".4" />
    <Path d="M7.5 1.5H12.5" stroke="#0b3d91" strokeWidth=".25" strokeDasharray=".6 .4" />
    <Path d="M2.2 4H1.2V5" fill="none" stroke="#0b3d91" strokeWidth=".45" />
    <Rect x=".3" y="4.6" width="1.4" height="3" rx=".5" fill="#fff" stroke="#0b3d91" strokeWidth=".45" />
    <Path d="M17.8 4H18.8V5" fill="none" stroke="#0b3d91" strokeWidth=".45" />
    <Rect x="18.3" y="4.6" width="1.4" height="3" rx=".5" fill="#fff" stroke="#0b3d91" strokeWidth=".45" />
    <Rect x="3.6" y="16.8" width="3" height="2.8" rx=".7" fill="#1a1a1a" />
    <Rect x="13.4" y="16.8" width="3" height="2.8" rx=".7" fill="#1a1a1a" />
    <Path d="M4.5 2H15.5Q18 2 18 4.8V17a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.8Q2 2 4.5 2Z" fill="#fff" stroke="#0b3d91" strokeWidth=".5" />
    <Path d="M4 3.4H16Q16.8 3.4 16.8 4.2V10.2H3.2V4.2Q3.2 3.4 4 3.4Z" fill="#0d2a6b" />
    <Path d="M4.2 9.6 9.4 4H11L5.6 9.6Z" fill="#fff" opacity=".08" />
    <Rect x="4" y="4" width="12" height=".5" rx=".25" fill="#3fa0ff" />
    <Path d="M10 3.4V10.2" stroke="#fff" strokeWidth=".4" />
    <Path d="M5 9.8 7.6 6.4M12 9.8 14.6 6.4" stroke="#1a1a1a" strokeWidth=".35" strokeLinecap="round" />
    <Circle cx="5" cy="7.6" r="1" fill="#fff" stroke="#1e44c8" strokeWidth=".35" />
    <Rect x="2.8" y="11.2" width="3.8" height="1.7" rx=".6" fill="#d8f1ff" stroke="#1e6be6" strokeWidth=".4" />
    <Rect x="13.4" y="11.2" width="3.8" height="1.7" rx=".6" fill="#d8f1ff" stroke="#1e6be6" strokeWidth=".4" />
    <Rect x="7.2" y="11.2" width="5.6" height="2.2" rx=".5" fill="#1a2a4a" />
    <Path d="M7.6 12.3H12.4" stroke="#1e6be6" strokeWidth=".3" />
    <Path d="M2.3 13.7H17.7V14.9H2.3Z" fill="#1e6be6" />
    <Rect x="5" y="15.6" width="10" height="1.3" rx=".5" fill="#1a2a4a" />
    <Rect x="2.8" y="15.9" width="1.6" height=".7" rx=".35" fill="#3fa0ff" />
    <Rect x="15.6" y="15.9" width="1.6" height=".7" rx=".35" fill="#3fa0ff" />
  </Svg>;
}
