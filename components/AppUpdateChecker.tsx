import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { getAppVersionInfo } from '@/src/api/appVersion';
import { getDismissedVersion, setDismissedVersion } from '@/src/utils/appUpdatePrompt';
import { isVersionLower } from '@/src/utils/version';

/**
 * Version app đang chạy trên máy — lấy từ `expo.version` trong app.config.js, được nhúng
 * vào build (embedded manifest) nên vẫn đọc được ở bản standalone/production, không chỉ
 * lúc chạy qua Metro. (Không dùng `expo-application` để tránh thêm dependency mới chỉ
 * cho 1 field; có thể đổi sang đó sau nếu cần đọc `nativeBuildVersion` thật từ OS.)
 */
function getCurrentVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/**
 * Kiểm tra cập nhật app 1 lần mỗi khi mở app (không tự chạy lại khi quay lại foreground,
 * tránh làm phiền trong CÙNG 1 lần mở app). So sánh version hiện tại với manifest lấy từ
 * backend (GET /api/v1/public/app-version — backend proxy + cache 1 file JSON trên S3).
 *
 * - current < minVersion  → "force update": chỉ có nút Cập nhật, không tắt được, KHÔNG
 *   thể bấm "Để sau" — vì vậy vẫn hiện lại mỗi lần mở app cho tới khi user thật sự update
 *   (đúng ý đồ, không tính là spam).
 * - current < latestVersion (nhưng >= minVersion) → "soft update": có nút Để sau. Nếu
 *   user bấm "Để sau" (hoặc dismiss), lưu lại `latestVersion` đó — lần mở app sau sẽ
 *   KHÔNG hiện lại cho tới khi backend đổi sang một `latestVersion` mới hơn.
 *
 * Không render UI gì (trả null) — chỉ side-effect hiện Alert. Đặt 1 lần ở root layout.
 */
export function AppUpdateChecker() {
  const checkedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ['app-version-check'],
    queryFn: getAppVersionInfo,
    staleTime: Infinity,
    retry: false,
    // Không cần chặn UI nếu lỗi — bỏ qua âm thầm là đủ, đây chỉ là thông báo phụ trợ.
    throwOnError: false,
  });

  useEffect(() => {
    if (!data || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      const current = getCurrentVersion();
      if (!current) return;

      const storeUrl = Platform.OS === 'ios' ? data.iosUrl : data.androidUrl;
      if (!storeUrl) return;

      const openStore = () => {
        Linking.openURL(storeUrl).catch(() => {
          Alert.alert('Không mở được liên kết', 'Vui lòng thử lại sau hoặc cập nhật thủ công qua App Store / Google Play.');
        });
      };

      const mustUpdate = !!data.minVersion && isVersionLower(current, data.minVersion);
      const canUpdate = !!data.latestVersion && isVersionLower(current, data.latestVersion);

      if (mustUpdate) {
        Alert.alert(
          'Cần cập nhật ứng dụng',
          data.message || 'Phiên bản bạn đang dùng đã quá cũ và không còn được hỗ trợ. Vui lòng cập nhật để tiếp tục sử dụng.',
          [{ text: 'Cập nhật ngay', onPress: openStore }],
          { cancelable: false },
        );
        return;
      }

      if (canUpdate && data.latestVersion) {
        const latestVersion = data.latestVersion;
        try {
          const dismissedVersion = await getDismissedVersion();
          if (dismissedVersion === latestVersion) return;
        } catch {
          // SecureStore lỗi → vẫn hiện lời nhắc (thà nhắc thừa còn hơn nuốt mất)
        }

        let skipPersistDismiss = false;
        const dismiss = () => {
          if (skipPersistDismiss) return;
          setDismissedVersion(latestVersion).catch(() => {});
        };

        Alert.alert(
          'Đã có phiên bản mới',
          data.message || 'Một phiên bản mới của Embox đã sẵn sàng. Cập nhật để có trải nghiệm tốt nhất.',
          [
            { text: 'Để sau', style: 'cancel', onPress: dismiss },
            {
              text: 'Cập nhật',
              onPress: () => {
                // Không ghi "đã để sau" — user định update; nếu quay lại chưa cài thì lần mở sau vẫn nhắc.
                skipPersistDismiss = true;
                openStore();
              },
            },
          ],
          // Android: bấm ra ngoài / nút back cũng tính là "để sau" — không thì vẫn hiện lại
          { onDismiss: dismiss },
        );
      }
    })().catch(() => {
      // Lỗi không lường trước (mạng đã được react-query bắt) — không chặn app.
    });
  }, [data]);

  return null;
}
