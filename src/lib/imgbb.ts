export const uploadImageToImgBB = async (file: File): Promise<string | null> => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    console.error("ImgBB API Key is missing. Please add VITE_IMGBB_API_KEY to your .env file.");
    return null;
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      return data.data.url; // Returns the direct image URL
    } else {
      console.error("ImgBB Upload Error:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error uploading to ImgBB:", error);
    return null;
  }
};
