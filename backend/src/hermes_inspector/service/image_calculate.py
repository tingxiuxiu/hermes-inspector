import cv2
import numpy as np
from enum import Enum
from typing import TypedDict, Tuple


class MatchAlgorithm(Enum):
    """Template matching algorithms for different scenarios.

    - TM_CCOEFF_NORMED: Correlation coefficient (normalized) - Good for general use, robust to lighting
    - TM_CCORR_NORMED: Cross-correlation (normalized) - Less sensitive to brightness changes
    - TM_SQDIFF_NORMED: Squared difference (normalized) - Good for exact matching
    - TM_CCOEFF: Correlation coefficient (unnormalized) - Faster but less robust
    - TM_CCORR: Cross-correlation (unnormalized) - Faster correlation
    - TM_SQDIFF: Squared difference (unnormalized) - Fastest exact matching

    Note: For SQDIFF methods, lower values indicate better matches.
    """

    TM_CCOEFF_NORMED = cv2.TM_CCOEFF_NORMED
    TM_CCORR_NORMED = cv2.TM_CCORR_NORMED
    TM_SQDIFF_NORMED = cv2.TM_SQDIFF_NORMED
    TM_CCOEFF = cv2.TM_CCOEFF
    TM_CCORR = cv2.TM_CCORR
    TM_SQDIFF = cv2.TM_SQDIFF


class SimilarityAlgorithm(Enum):
    """图片相似度对比算法 / Image similarity comparison algorithms.

    不同算法适用于不同场景：
    Different algorithms for different scenarios:

    - HISTOGRAM: 直方图比较 - 快速，适合颜色分布相似的图片
                 Histogram comparison - Fast, good for similar color distribution
    - SSIM: 结构相似度 - 考虑亮度、对比度和结构，适合评估图像质量
            Structural Similarity - Considers luminance, contrast, structure
    - ORB: 特征匹配 - 基于关键点，适合有旋转/缩放的图片
           Feature matching - Keypoint-based, good for rotated/scaled images
    - PHASH: 感知哈希 - 快速，适合查找近似重复图片
             Perceptual hash - Fast, good for finding near-duplicate images
    """

    HISTOGRAM = "histogram"
    SSIM = "ssim"
    ORB = "orb"
    PHASH = "phash"


class MatchResult(TypedDict):
    """Type definition for a single match result."""

    x: int
    y: int
    w: int
    h: int
    confidence: float


class ImageCalculateService:
    """Image calculation service for template matching operations."""

    def __init__(self) -> None:
        pass

    def match(
        self,
        image_path: str,
        template_path: str,
        threshold: float = 0.8,
        algorithm: MatchAlgorithm = MatchAlgorithm.TM_CCOEFF_NORMED,
    ) -> list[MatchResult]:
        """
        Match template in image using OpenCV template matching.

        Locate template in image using OpenCV template matching.

        This is the main entry point for template matching. It orchestrates the entire
        matching pipeline: loading images, performing template matching, filtering results,
        and applying non-maximum suppression.

        Args:
            image_path: Path to the target image
            template_path: Path to the template image to find
            threshold: Confidence threshold (0.0-1.0 for normalized methods).
                      For SQDIFF methods, represents the percentile of best matches to accept.
                      For unnormalized methods, may need much larger values (e.g., 1000000+).
            algorithm: Matching algorithm to use (default: TM_CCOEFF_NORMED)

        Returns:
            List of matches with position (x, y), size (w, h), and confidence

        Algorithm Selection Guide:
            - TM_CCOEFF_NORMED: Best for general use, handles lighting variations well (recommended)
            - TM_CCORR_NORMED: Good when brightness differs between images
            - TM_SQDIFF_NORMED: Best for exact pixel matching
            - Unnormalized versions: Faster but require careful threshold tuning

        Threshold Recommendations:
            - Normalized methods (TM_*_NORMED): Use 0.8-0.95 for good matches
            - SQDIFF methods: Use 0.1-0.3 (lower = stricter, accepts top % of matches)
            - Unnormalized methods: Highly image-dependent, start with very large values
        """
        # Step 1: Load and validate images
        image, template = self._load_images(image_path, template_path)

        # Step 2: Perform template matching
        match_result = self._apply_template_matching(image, template, algorithm)

        # Step 3: Determine if using SQDIFF algorithm (inverted logic)
        is_sqdiff = self._is_sqdiff_algorithm(algorithm)

        # Step 4: Filter matches by threshold
        match_locations = self._filter_matches_by_threshold(
            match_result, threshold, is_sqdiff
        )

        # Step 5: Collect all matches with confidence scores
        matches = self._collect_matches(
            match_locations, match_result, template, algorithm, is_sqdiff
        )

        # Step 6: Apply Non-Maximum Suppression to remove duplicates
        final_matches = self._apply_nms(matches, threshold, is_sqdiff)

        return final_matches

    def _load_images(
        self, image_path: str, template_path: str
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Load target image and template image from disk.

        Args:
            image_path: Path to the target image
            template_path: Path to the template image

        Returns:
            Tuple of (image, template) as numpy arrays

        Raises:
            ValueError: If either image cannot be loaded
        """
        image = cv2.imread(image_path)
        template = cv2.imread(template_path)

        if image is None:
            raise ValueError(f"Could not load image at {image_path}")
        if template is None:
            raise ValueError(f"Could not load template at {template_path}")

        return image, template

    def _apply_template_matching(
        self, image: np.ndarray, template: np.ndarray, algorithm: MatchAlgorithm
    ) -> np.ndarray:
        """
        Apply OpenCV template matching algorithm.

        Args:
            image: Target image as numpy array
            template: Template image to search for
            algorithm: Matching algorithm to use

        Returns:
            Match result matrix where each pixel represents match quality at that position
        """
        return cv2.matchTemplate(image, template, algorithm.value)

    def _is_sqdiff_algorithm(self, algorithm: MatchAlgorithm) -> bool:
        """
        Check if the algorithm is a SQDIFF variant.

        SQDIFF algorithms have inverted logic: lower values indicate better matches.

        Args:
            algorithm: The matching algorithm

        Returns:
            True if algorithm is SQDIFF or SQDIFF_NORMED
        """
        return algorithm in (MatchAlgorithm.TM_SQDIFF, MatchAlgorithm.TM_SQDIFF_NORMED)

    def _filter_matches_by_threshold(
        self, result: np.ndarray, threshold: float, is_sqdiff: bool
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Filter match results by threshold value.

        For SQDIFF algorithms, uses percentile-based filtering (lower is better).
        For other algorithms, uses direct threshold comparison (higher is better).

        Args:
            result: Match result matrix from template matching
            threshold: Threshold value for filtering
            is_sqdiff: Whether using SQDIFF algorithm

        Returns:
            Tuple of (y_coords, x_coords) arrays of matching locations
        """
        if is_sqdiff:
            # For SQDIFF: lower values are better matches
            # Use threshold as percentile: 0.2 means accept bottom 20% of values
            min_val = np.min(result)
            max_val = np.max(result)
            threshold_value = min_val + (max_val - min_val) * threshold
            loc = np.where(result <= threshold_value)
        else:
            # For other methods: higher values are better matches
            loc = np.where(result >= threshold)

        return loc

    def _collect_matches(
        self,
        locations: Tuple[np.ndarray, np.ndarray],
        result: np.ndarray,
        template: np.ndarray,
        algorithm: MatchAlgorithm,
        is_sqdiff: bool,
    ) -> list[MatchResult]:
        """
        Collect all matches from filtered locations and compute confidence scores.

        Args:
            locations: Tuple of (y_coords, x_coords) from threshold filtering
            result: Match result matrix
            template: Template image (used to get dimensions)
            algorithm: Matching algorithm used
            is_sqdiff: Whether using SQDIFF algorithm

        Returns:
            List of match results with positions and confidence scores
        """
        # Get template dimensions
        h, w = template.shape[:2]

        matches: list[MatchResult] = []
        # loc[::-1] reverses to get (x, y) instead of (y, x)
        for pt in zip(*locations[::-1]):
            # Get raw confidence value at this location
            raw_confidence = result[pt[1], pt[0]]

            # Convert to normalized similarity score (0-1, higher is better)
            confidence = self._convert_to_similarity_score(
                raw_confidence, algorithm, is_sqdiff
            )

            # Create match result
            match: MatchResult = {
                "x": int(pt[0]),
                "y": int(pt[1]),
                "w": int(w),
                "h": int(h),
                "confidence": confidence,
            }
            matches.append(match)

        return matches

    def _convert_to_similarity_score(
        self, raw_value: float, algorithm: MatchAlgorithm, is_sqdiff: bool
    ) -> float:
        """
        Convert raw matching value to normalized similarity score.

        For SQDIFF algorithms, inverts the value since lower is better.
        For other algorithms, uses the value directly.

        Args:
            raw_value: Raw matching value from template matching
            algorithm: Matching algorithm used
            is_sqdiff: Whether using SQDIFF algorithm

        Returns:
            Normalized similarity score (0-1, higher is better)
        """
        if is_sqdiff:
            # For SQDIFF: 0 is perfect match, higher values are worse
            if algorithm == MatchAlgorithm.TM_SQDIFF_NORMED:
                # Normalized version: simply invert (1 - value)
                return 1.0 - float(raw_value)
            else:
                # Unnormalized version: use inverse function
                return 1.0 / (1.0 + float(raw_value))
        else:
            # For other methods: higher values are better, use directly
            return float(raw_value)

    def _apply_nms(
        self, matches: list[MatchResult], threshold: float, is_sqdiff: bool
    ) -> list[MatchResult]:
        """
        Apply Non-Maximum Suppression to remove overlapping duplicate matches.

        NMS keeps only the best match when multiple matches overlap significantly.
        This prevents returning the same object multiple times.

        Args:
            matches: List of all matches before NMS
            threshold: Original threshold value
            is_sqdiff: Whether using SQDIFF algorithm

        Returns:
            Filtered list of matches after NMS
        """
        # Early return if no matches
        if not matches:
            return []

        # Convert matches to format required by OpenCV NMS
        boxes: list[list[int]] = [[m["x"], m["y"], m["w"], m["h"]] for m in matches]
        scores: list[float] = [m["confidence"] for m in matches]

        # Calculate NMS threshold
        # For SQDIFF, we've already converted to similarity scores (higher is better)
        # so we need to invert the threshold for NMS score filtering
        nms_threshold_value = 1.0 - threshold if is_sqdiff else threshold

        # Apply NMS with 0.5 IoU threshold for overlap detection
        indices = cv2.dnn.NMSBoxes(
            boxes, scores, score_threshold=nms_threshold_value, nms_threshold=0.5
        )

        # Extract final matches based on NMS results
        final_matches: list[MatchResult] = []
        if len(indices) > 0:
            for i in indices:
                # Handle different return types from NMSBoxes
                # (can be numpy array or list depending on OpenCV version)
                try:
                    idx = int(i[0])  # type: ignore[index]
                except (IndexError, TypeError):
                    idx = int(i)
                final_matches.append(matches[idx])

        return final_matches

    # ==================== 图片相似度对比功能 / Image Similarity Comparison ====================

    def compare_similarity(
        self,
        image1_path: str,
        image2_path: str,
        algorithm: SimilarityAlgorithm = SimilarityAlgorithm.HISTOGRAM,
    ) -> float:
        """
        对比两张图片的相似度 / Compare similarity between two images.

        这是相似度对比的主入口函数，根据选择的算法调用相应的实现。
        Main entry point for similarity comparison, dispatches to specific algorithm.

        Args:
            image1_path: 第一张图片路径 / Path to first image
            image2_path: 第二张图片路径 / Path to second image
            algorithm: 相似度算法 / Similarity algorithm (default: HISTOGRAM)

        Returns:
            相似度分数 (0-1)，1表示完全相同 / Similarity score (0-1), 1 means identical

        算法选择指南 / Algorithm Selection Guide:
            - HISTOGRAM: 快速，适合颜色分布相似 / Fast, good for color distribution
            - SSIM: 高质量，适合图像质量评估 / High quality, good for image quality
            - ORB: 适合旋转/缩放图片 / Good for rotated/scaled images
            - PHASH: 快速查找重复图片 / Fast duplicate detection

        Raises:
            ValueError: 如果图片无法加载 / If images cannot be loaded
        """
        # 加载两张图片 / Load both images
        image1, image2 = self._load_two_images(image1_path, image2_path)

        # 根据算法类型调用相应的实现 / Dispatch to specific algorithm
        if algorithm == SimilarityAlgorithm.HISTOGRAM:
            return self._compare_histogram(image1, image2)
        elif algorithm == SimilarityAlgorithm.SSIM:
            return self._compare_ssim(image1, image2)
        elif algorithm == SimilarityAlgorithm.ORB:
            return self._compare_orb(image1, image2)
        elif algorithm == SimilarityAlgorithm.PHASH:
            return self._compare_phash(image1, image2)
        else:
            raise ValueError(f"Unknown similarity algorithm: {algorithm}")

    def _load_two_images(
        self, image1_path: str, image2_path: str
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        加载两张图片 / Load two images from disk.

        Args:
            image1_path: 第一张图片路径 / Path to first image
            image2_path: 第二张图片路径 / Path to second image

        Returns:
            两张图片的numpy数组 / Tuple of (image1, image2) as numpy arrays

        Raises:
            ValueError: 如果任一图片无法加载 / If either image cannot be loaded
        """
        image1 = cv2.imread(image1_path)
        image2 = cv2.imread(image2_path)

        if image1 is None:
            raise ValueError(f"Could not load image at {image1_path}")
        if image2 is None:
            raise ValueError(f"Could not load image at {image2_path}")

        return image1, image2

    def _compare_histogram(self, image1: np.ndarray, image2: np.ndarray) -> float:
        """
        使用直方图比较计算相似度 / Calculate similarity using histogram comparison.

        直方图比较通过对比颜色分布来判断相似度，速度快但不考虑空间信息。
        Histogram comparison judges similarity by color distribution, fast but ignores spatial info.

        算法步骤 / Algorithm steps:
        1. 转换为HSV色彩空间（比RGB更接近人眼感知）
           Convert to HSV color space (closer to human perception than RGB)
        2. 计算每张图片的颜色直方图
           Calculate color histogram for each image
        3. 使用相关系数法比较直方图
           Compare histograms using correlation method

        Args:
            image1: 第一张图片 / First image
            image2: 第二张图片 / Second image

        Returns:
            相似度分数 (0-1) / Similarity score (0-1)
        """
        # 转换为HSV色彩空间 / Convert to HSV color space
        # HSV更适合颜色比较，因为它分离了色调、饱和度和明度
        # HSV is better for color comparison as it separates hue, saturation, and value
        hsv1 = cv2.cvtColor(image1, cv2.COLOR_BGR2HSV)
        hsv2 = cv2.cvtColor(image2, cv2.COLOR_BGR2HSV)

        # 计算直方图 / Calculate histograms
        # 参数说明 / Parameters:
        # - [0, 1]: 使用H和S通道 / Use H and S channels
        # - None: 不使用mask / No mask
        # - [180, 256]: H通道180个bins，S通道256个bins / Bins for H and S
        # - [0, 180, 0, 256]: H范围0-180，S范围0-256 / Ranges for H and S
        hist1 = cv2.calcHist([hsv1], [0, 1], None, [180, 256], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [180, 256], [0, 180, 0, 256])

        # 归一化直方图 / Normalize histograms
        # 归一化使得不同大小的图片可以比较
        # Normalization allows comparison of different sized images
        cv2.normalize(hist1, hist1, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

        # 使用相关系数法比较 / Compare using correlation method
        # HISTCMP_CORREL返回-1到1，我们转换为0到1
        # HISTCMP_CORREL returns -1 to 1, we convert to 0 to 1
        similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)

        # 确保返回值在0-1范围内 / Ensure return value is in 0-1 range
        return max(0.0, float(similarity))

    def _compare_ssim(self, image1: np.ndarray, image2: np.ndarray) -> float:
        """
        使用结构相似度(SSIM)计算相似度 / Calculate similarity using SSIM.

        SSIM考虑亮度、对比度和结构三个方面，是评估图像质量的标准方法。
        SSIM considers luminance, contrast, and structure - standard for image quality assessment.

        优点 / Advantages:
        - 更接近人眼感知 / Closer to human perception
        - 考虑空间结构信息 / Considers spatial structure

        注意 / Note:
        - 两张图片必须尺寸相同 / Images must have same dimensions
        - 计算速度较慢 / Slower computation

        Args:
            image1: 第一张图片 / First image
            image2: 第二张图片 / Second image

        Returns:
            相似度分数 (0-1) / Similarity score (0-1)
        """
        # 调整图片到相同尺寸 / Resize to same dimensions
        # SSIM要求两张图片尺寸完全相同
        # SSIM requires images to have identical dimensions
        image1, image2 = self._resize_to_same_size(image1, image2)

        # 转换为灰度图 / Convert to grayscale
        # SSIM通常在灰度图上计算以提高速度
        # SSIM is typically calculated on grayscale for speed
        gray1 = cv2.cvtColor(image1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(image2, cv2.COLOR_BGR2GRAY)

        # 计算SSIM / Calculate SSIM
        # 使用11x11的高斯窗口（标准做法）
        # Use 11x11 Gaussian window (standard practice)
        from skimage.metrics import structural_similarity

        score = structural_similarity(gray1, gray2, win_size=11)

        # SSIM返回-1到1，转换为0到1
        # SSIM returns -1 to 1, convert to 0 to 1
        return (float(score) + 1.0) / 2.0

    def _compare_orb(self, image1: np.ndarray, image2: np.ndarray) -> float:
        """
        使用ORB特征匹配计算相似度 / Calculate similarity using ORB feature matching.

        ORB (Oriented FAST and Rotated BRIEF) 是一种快速的特征检测和描述算法。
        ORB is a fast feature detection and description algorithm.

        优点 / Advantages:
        - 对旋转和缩放不敏感 / Invariant to rotation and scale
        - 速度快 / Fast computation
        - 适合物体识别 / Good for object recognition

        算法步骤 / Algorithm steps:
        1. 检测关键点 / Detect keypoints
        2. 计算特征描述符 / Compute feature descriptors
        3. 匹配特征点 / Match features
        4. 根据匹配质量计算相似度 / Calculate similarity from match quality

        Args:
            image1: 第一张图片 / First image
            image2: 第二张图片 / Second image

        Returns:
            相似度分数 (0-1) / Similarity score (0-1)
        """
        # 转换为灰度图 / Convert to grayscale
        # ORB在灰度图上工作 / ORB works on grayscale images
        gray1 = cv2.cvtColor(image1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(image2, cv2.COLOR_BGR2GRAY)

        # 创建ORB检测器 / Create ORB detector
        # nfeatures=500: 最多检测500个特征点
        # nfeatures=500: Detect up to 500 features
        orb = cv2.ORB_create(nfeatures=500)

        # 检测关键点和计算描述符 / Detect keypoints and compute descriptors
        keypoints1, descriptors1 = orb.detectAndCompute(gray1, None)
        keypoints2, descriptors2 = orb.detectAndCompute(gray2, None)

        # 如果任一图片没有检测到特征点，返回0
        # If no features detected in either image, return 0
        if descriptors1 is None or descriptors2 is None:
            return 0.0

        # 使用BFMatcher进行特征匹配 / Use BFMatcher for feature matching
        # NORM_HAMMING: ORB使用二进制描述符，用汉明距离匹配
        # NORM_HAMMING: ORB uses binary descriptors, match with Hamming distance
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(descriptors1, descriptors2)

        # 如果没有匹配，返回0 / If no matches, return 0
        if len(matches) == 0:
            return 0.0

        # 根据匹配质量计算相似度 / Calculate similarity from match quality
        # 使用匹配数量和匹配距离的组合
        # Use combination of match count and match distance

        # 计算平均匹配距离 / Calculate average match distance
        avg_distance = sum(m.distance for m in matches) / len(matches)

        # 匹配率：实际匹配数 / 最小特征点数
        # Match ratio: actual matches / min feature count
        match_ratio = len(matches) / min(len(keypoints1), len(keypoints2))

        # 距离相似度：距离越小越相似，归一化到0-1
        # Distance similarity: smaller distance = more similar, normalize to 0-1
        # ORB距离通常在0-100范围内
        # ORB distance typically in 0-100 range
        distance_similarity = max(0.0, 1.0 - (avg_distance / 100.0))

        # 综合相似度：匹配率和距离相似度的加权平均
        # Combined similarity: weighted average of match ratio and distance similarity
        similarity = 0.5 * match_ratio + 0.5 * distance_similarity

        return min(1.0, float(similarity))

    def _compare_phash(self, image1: np.ndarray, image2: np.ndarray) -> float:
        """
        使用感知哈希(pHash)计算相似度 / Calculate similarity using perceptual hash.

        感知哈希通过将图片转换为固定长度的哈希值来快速比较相似度。
        Perceptual hash quickly compares similarity by converting images to fixed-length hashes.

        优点 / Advantages:
        - 非常快速 / Very fast
        - 对轻微修改不敏感 / Robust to minor modifications
        - 适合大规模图片去重 / Good for large-scale deduplication

        算法步骤 / Algorithm steps:
        1. 缩小图片到32x32 / Resize to 32x32
        2. 转换为灰度 / Convert to grayscale
        3. 计算DCT变换 / Compute DCT transform
        4. 提取低频信息生成哈希 / Extract low-frequency info to generate hash
        5. 比较两个哈希的汉明距离 / Compare Hamming distance of hashes

        Args:
            image1: 第一张图片 / First image
            image2: 第二张图片 / Second image

        Returns:
            相似度分数 (0-1) / Similarity score (0-1)
        """
        # 计算两张图片的感知哈希 / Compute perceptual hash for both images
        hash1 = self._compute_phash(image1)
        hash2 = self._compute_phash(image2)

        # 计算汉明距离（不同位的数量）/ Calculate Hamming distance (number of different bits)
        hamming_distance = np.sum(hash1 != hash2)

        # 转换为相似度分数 / Convert to similarity score
        # 哈希长度为64位，距离越小越相似
        # Hash length is 64 bits, smaller distance = more similar
        similarity = 1.0 - (hamming_distance / 64.0)

        return float(similarity)

    def _compute_phash(self, image: np.ndarray) -> np.ndarray:
        """
        计算图片的感知哈希值 / Compute perceptual hash of an image.

        感知哈希算法步骤 / Perceptual hash algorithm:
        1. 缩小到32x32像素 / Resize to 32x32 pixels
        2. 转换为灰度图 / Convert to grayscale
        3. 计算DCT（离散余弦变换）/ Compute DCT (Discrete Cosine Transform)
        4. 提取左上角8x8的低频部分 / Extract top-left 8x8 low-frequency part
        5. 计算均值并二值化 / Calculate mean and binarize

        Args:
            image: 输入图片 / Input image

        Returns:
            64位哈希值（8x8布尔数组）/ 64-bit hash (8x8 boolean array)
        """
        # 步骤1: 缩小到32x32 / Step 1: Resize to 32x32
        # 缩小可以去除细节，保留结构信息
        # Resizing removes details, preserves structural info
        resized = cv2.resize(image, (32, 32), interpolation=cv2.INTER_AREA)

        # 步骤2: 转换为灰度 / Step 2: Convert to grayscale
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # 步骤3: 计算DCT / Step 3: Compute DCT
        # DCT将图像从空间域转换到频率域
        # DCT transforms image from spatial domain to frequency domain
        dct = cv2.dct(np.float32(gray))

        # 步骤4: 提取左上角8x8的低频部分 / Step 4: Extract top-left 8x8 low-frequency part
        # 低频部分包含图像的主要结构信息
        # Low-frequency part contains main structural info
        dct_low = dct[:8, :8]

        # 步骤5: 计算均值并二值化 / Step 5: Calculate mean and binarize
        # 大于均值的设为1，小于的设为0
        # Set to 1 if greater than mean, 0 otherwise
        median = np.median(dct_low)
        hash_value = dct_low > median

        return hash_value

    def _resize_to_same_size(
        self, image1: np.ndarray, image2: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        将两张图片调整到相同尺寸 / Resize two images to the same dimensions.

        策略：使用两张图片中较小的尺寸，以避免放大导致的质量损失。
        Strategy: Use the smaller dimensions to avoid quality loss from upscaling.

        Args:
            image1: 第一张图片 / First image
            image2: 第二张图片 / Second image

        Returns:
            调整后的两张图片 / Tuple of resized images
        """
        # 获取两张图片的尺寸 / Get dimensions of both images
        h1, w1 = image1.shape[:2]
        h2, w2 = image2.shape[:2]

        # 如果尺寸已经相同，直接返回 / If already same size, return as is
        if h1 == h2 and w1 == w2:
            return image1, image2

        # 使用较小的尺寸 / Use smaller dimensions
        target_h = min(h1, h2)
        target_w = min(w1, w2)

        # 调整图片大小 / Resize images
        # INTER_AREA适合缩小图片 / INTER_AREA is good for shrinking
        resized1 = cv2.resize(
            image1, (target_w, target_h), interpolation=cv2.INTER_AREA
        )
        resized2 = cv2.resize(
            image2, (target_w, target_h), interpolation=cv2.INTER_AREA
        )

        return resized1, resized2
