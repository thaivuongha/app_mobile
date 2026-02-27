# Lệnh thường dùng — Mobile (Expo)

## Phát triển

```bash
# Cài dependencies
npm install

# Chạy Expo (chọn device/simulator)
npm start

# Chạy trên Android
npm run android

# Chạy trên iOS (cần macOS)
npm run ios

# Chạy trên Web
npm run web
```

## Biến môi trường

Tạo file `.env` (xem `.env.example`):

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

- Khi test trên thiết bị thật, dùng IP máy (ví dụ `http://192.168.1.10:3000`) thay vì `localhost`.

## Cấu trúc chính

- `app/` — Expo Router: `(auth)`, `(tabs)`, `index` (gate), `modal`
- `app/(auth)/` — Login, Register, Forgot/Reset password
- `app/(tabs)/` — Dashboard, Devices, Shop, Orders, Sales, Settings, Account
- `src/api/` — API client, token storage, auth, resources
- `src/stores/` — Zustand (auth, cart)
- `src/config/` — env (API_BASE_URL)

## Auth

- Đăng nhập bằng **số điện thoại** + mật khẩu.
- JWT lưu trong SecureStore; refresh token khi 401.
- Sau đăng nhập chuyển vào tab Trang chủ.
