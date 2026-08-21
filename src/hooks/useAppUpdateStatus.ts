import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION_QUERY_KEY, getAppVersionInfo } from '@/src/api/appVersion';
import { isVersionLower } from '@/src/utils/version';

export function getCurrentAppVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/**
 * Trạng thái cập nhật app — dùng chung cho popup lúc mở app và mục "Về ứng dụng".
 * "Để sau" chỉ ẩn popup lúc mở app; mục Cá nhân vẫn báo có bản mới.
 */
export function useAppUpdateStatus() {
  const currentVersion = getCurrentAppVersion();
  const { data } = useQuery({
    queryKey: APP_VERSION_QUERY_KEY,
    queryFn: getAppVersionInfo,
    staleTime: Infinity,
    retry: false,
    throwOnError: false,
  });

  const storeUrl = Platform.OS === 'ios' ? data?.iosUrl ?? null : data?.androidUrl ?? null;
  const latestVersion = data?.latestVersion ?? null;
  const minVersion = data?.minVersion ?? null;

  const hasNewer =
    !!currentVersion && !!latestVersion && isVersionLower(currentVersion, latestVersion);
  const isForce =
    !!currentVersion && !!minVersion && isVersionLower(currentVersion, minVersion);

  // Ép cập nhật vẫn phải hiện dù latestVersion bị cấu hình thấp hơn / thiếu
  // (vd. minVersion > latestVersion).
  const hasUpdate = !!storeUrl && (hasNewer || isForce);
  const targetVersion = latestVersion ?? minVersion;

  const message =
    data?.message ||
    (isForce
      ? 'Phiên bản bạn đang dùng đã quá cũ và không còn được hỗ trợ. Vui lòng cập nhật để tiếp tục sử dụng.'
      : 'Một phiên bản mới của Embox đã sẵn sàng. Cập nhật để có trải nghiệm tốt nhất.');

  return {
    currentVersion,
    latestVersion,
    targetVersion,
    storeUrl,
    hasUpdate,
    isForce,
    message,
  };
}
