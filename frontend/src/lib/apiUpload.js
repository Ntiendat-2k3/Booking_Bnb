import api from "./api";

/**
 * Multipart/form-data upload helper using Axios.
 */
export async function apiUpload(path, formData, opts = {}) {
  const { 
    method = "POST", 
    headers, 
    timeoutMs = 30000,
    ...rest 
  } = opts;

  return api({
    url: path,
    method: method.toLowerCase(),
    data: formData,
    headers: {
      ...headers,
      "Content-Type": "multipart/form-data",
    },
    timeout: timeoutMs,
    ...rest,
  });
}
