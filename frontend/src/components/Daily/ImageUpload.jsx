import { useState } from 'react';
import { getLocalDateString } from '../../utils/helpers';

function ImageUpload({ currentDate, images, onImageUploaded, onImageDeleted }) {
  const [uploading, setUploading] = useState(false);

  const dateKey = getLocalDateString(currentDate);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('date', dateKey);

      const response = await fetch('http://localhost:5001/api/images/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        onImageUploaded(result.data);
        e.target.value = ''; // Reset input
      } else {
        alert('업로드 실패: ' + result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`http://localhost:5001/api/images/${imageId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        onImageDeleted(imageId);
      } else {
        alert('삭제 실패: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="image-upload-section">
      <div className="section-header">📷 오늘의 사진</div>

      <div className="images-grid">
        {images && images.length > 0 && images.map((image) => (
          <div key={image.id} className="image-item">
            <img
              src={image.view_url}
              alt={image.file_name}
              className="image-thumbnail"
            />
            <button
              className="image-delete-btn"
              onClick={() => handleDelete(image.id)}
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}

        {/* Upload button card - always last */}
        <label className="image-upload-card">
          <div className="upload-icon">+</div>
          <div className="upload-text">사진 추가</div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}

export default ImageUpload;
