import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export async function pickProfilePhoto(): Promise<FormData | null> {
  if (Platform.OS !== "web" && !(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted) throw new Error("Allow photo access in device settings to choose a profile picture.");
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
  const image = result.canceled ? null : result.assets?.[0];
  if (!image) return null;
  if (!image.mimeType || !["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)) throw new Error("Choose a JPG, PNG or WebP photo.");
  if ((image.fileSize ?? 0) > 3 * 1024 * 1024) throw new Error("Choose a photo 3 MB or smaller.");
  if (image.width > 4096 || image.height > 4096) throw new Error("Choose a photo no larger than 4096 × 4096 pixels.");
  const body = new FormData();
  body.append("photo", image.file ?? ({ uri: image.uri, name: image.fileName ?? "profile.jpg", type: image.mimeType } as unknown as Blob));
  return body;
}
