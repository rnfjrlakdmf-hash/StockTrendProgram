export const checkReward = (): boolean => {
    if (typeof window === 'undefined') return false;

    // Pro User Check
    const isPro = localStorage.getItem("isPro") === "true";
    if (isPro) return true;

    // Time-based Reward Check
    const expiry = localStorage.getItem("rewardExpiry");
    if (expiry) {
        if (parseInt(expiry) > Date.now()) {
            return true;
        }
        // Expired
        localStorage.removeItem("rewardExpiry");
    }
    return false;
};

export const MAX_REWARD_HOURS = 10;
export const MAX_REWARD_MS = MAX_REWARD_HOURS * 60 * 60 * 1000;

export const grantReward = (minutes: number): { success: boolean, message: string, isFull: boolean } => {
    const now = Date.now();
    const currentExpiry = localStorage.getItem("rewardExpiry");
    let baseTime = now;

    if (currentExpiry && parseInt(currentExpiry) > now) {
        baseTime = parseInt(currentExpiry);
    }

    // 이미 최대 시간을 초과한 경우
    if (baseTime - now >= MAX_REWARD_MS) {
        return { success: false, message: `이미 최대 충전 한도(${MAX_REWARD_HOURS}시간)에 도달했습니다.`, isFull: true };
    }

    const addedMs = minutes * 60 * 1000;
    let newExpiry = baseTime + addedMs;

    // 최대 시간(10시간)을 넘지 않도록 캡핑(Capping)
    if (newExpiry - now > MAX_REWARD_MS) {
        newExpiry = now + MAX_REWARD_MS;
    }

    localStorage.setItem("rewardExpiry", newExpiry.toString());

    const isFullNow = (newExpiry - now) >= MAX_REWARD_MS;
    return { success: true, message: `${minutes}분 충전 완료!`, isFull: isFullNow };
};

export const getRewardTimeLeft = (): string => {
    if (typeof window === 'undefined') return "";
    const expiry = localStorage.getItem("rewardExpiry");
    if (!expiry) return "";

    const diff = parseInt(expiry) - Date.now();
    if (diff <= 0) return "";

    const minutes = Math.ceil(diff / 60000);
    if (minutes > 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}시간 ${m}분`;
    }
    return `${minutes}분`;
};
