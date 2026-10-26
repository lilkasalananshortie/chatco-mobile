/// <reference types="jest" />
import * as ImagePicker from "expo-image-picker";
import { pickProfilePhoto } from "../../../features/settings/profile-photo";
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-image-picker", () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
const asset = { uri: "file:///photo.jpg", fileName: "photo.jpg", mimeType: "image/jpeg", width: 120, height: 120, fileSize: 1000 };
beforeEach(() => { jest.resetAllMocks(); (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true }); (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] }); });
test("photo picker requests a square crop and returns multipart", async () => { expect(await pickProfilePhoto()).toBeInstanceOf(FormData); expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1] })); });
test("denied permission does not open the picker", async () => { (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false }); await expect(pickProfilePhoto()).rejects.toThrow("Allow photo access"); expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled(); });
test("cancelled picker does not produce an upload", async () => { (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true }); expect(await pickProfilePhoto()).toBeNull(); });
test.each([{ ...asset, mimeType: "image/svg+xml" }, { ...asset, fileSize: 4 * 1024 * 1024 }, { ...asset, width: 5000 }])("invalid image rejected before network upload", async value => { (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [value] }); await expect(pickProfilePhoto()).rejects.toThrow(); });
