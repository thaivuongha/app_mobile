import { useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { AppUpdateModal } from '@/components/AppUpdateModal';
import { useAppUpdateStatus } from '@/src/hooks/useAppUpdateStatus';
import { getDismissedVersion, setDismissedVersion } from '@/src/utils/appUpdatePrompt';

/**
 * Kiểm tra cập nhật 1 lần mỗi khi mở app.
 *
 * - current < minVersion  → force: không tắt được bằng backdrop / nút back.
 * - current < latestVersion → soft: "Để sau" nhớ latestVersion, không spam cùng một bản
 *   lúc mở app. Mục "Về ứng dụng" vẫn báo có bản mới.
 */
export function AppUpdateChecker() {
  const checkedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const status = useAppUpdateStatus();

  useEffect(() => {
    if (checkedRef.current) return;
    if (!status.hasUpdate || !status.currentVersion || !status.targetVersion) return;
    checkedRef.current = true;

    (async () => {
      if (!status.isForce) {
        try {
          const dismissedVersion = await getDismissedVersion();
          if (dismissedVersion === status.targetVersion) return;
        } catch {
          // SecureStore lỗi → vẫn hiện lời nhắc
        }
      }
      setVisible(true);
    })().catch(() => {});
  }, [status.hasUpdate, status.isForce, status.currentVersion, status.targetVersion]);

  const closeSoft = () => {
    if (status.isForce || !status.targetVersion) return;
    setDismissedVersion(status.targetVersion).catch(() => {});
    setVisible(false);
  };

  const openStore = () => {
    if (!status.storeUrl) return;
    Linking.openURL(status.storeUrl).catch(() => {
      Alert.alert(
        'Không mở được liên kết',
        'Vui lòng thử lại sau hoặc cập nhật thủ công qua App Store / Google Play.',
      );
    });
    // Soft: đóng overlay khi đi store — không ghi "Để sau", lần mở app sau vẫn nhắc nếu chưa cài.
    if (!status.isForce) setVisible(false);
  };

  if (!status.currentVersion || !status.targetVersion) return null;

  return (
    <AppUpdateModal
      visible={visible}
      kind={status.isForce ? 'force' : 'soft'}
      message={status.message}
      currentVersion={status.currentVersion}
      latestVersion={status.targetVersion}
      onUpdate={openStore}
      onLater={status.isForce ? undefined : closeSoft}
    />
  );
}
