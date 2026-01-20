
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7dvBO__0Dqr0igu9oEDPcsQwuZn-T-mqu0RdM7KFmzJ3e-FLp6mfoljEdMNyA5Xllug/exec";

/**
 * Service to handle Google Drive uploads via Apps Script Bridge
 */

export const uploadToGoogleDrive = async (
  file: File,
  candidateName: string,
  cidade: string,
  role: string
): Promise<{ success: boolean; id?: string; url?: string; error?: string }> => {
  try {
    const base64File = await fileToBase64(file);
    // Sanitize filename
    const safeName = candidateName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeRole = role.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeName}_${safeRole}.pdf`;

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        fileData: base64File,
        fileName: fileName,
        mimeType: file.type,
        // Metadata intended for the Google Script to use
        nome: candidateName,
        cidade: cidade,
        cargo: role
      })
    });

    const result = await response.json();

    if (result.result === "success") {
      return {
        success: true,
        id: result.fileId,
        url: result.fileUrl
      };
    } else {
      throw new Error(result.error || "Unknown error from Google Script");
    }

  } catch (error: any) {
    console.error("Error uploading to Google Drive via Script:", error);
    return { success: false, error: error.message };
  }
};



/**
 * Helper to convert File to Base64 (stripping header)
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:application/pdf;base64," header
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const logAccess = async (userId: string, email: string, resourceId: string, action: string) => {
  // Mantendo a função de log existente ou importando do userService se preferir unificar
  console.log(`[Drive Log] ${action} on ${resourceId} by ${email}`);
};
