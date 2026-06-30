export async function getCachedProfileImage(
  imageUrl: string,
): Promise<string | null> {
  const absoluteUrl = new URL(imageUrl, window.location.origin).toString()
  const cache = await caches.open("profile-images")
  const CACHE_MAX_AGE = 24 * 3600 * 1000

  // Try to serve from cache
  const cachedResponse = await cache.match(absoluteUrl)
  if (cachedResponse) {
    const ts = cachedResponse.headers.get("time")
    if (ts && Date.now() - new Date(ts).getTime() < CACHE_MAX_AGE) {
      return URL.createObjectURL(await cachedResponse.blob())
    }
  }

  // Fetch fresh
  let response: Response
  try {
    response = await fetch(absoluteUrl, { mode: "cors" })
  } catch (error) {
    console.error("Error fetching profile image:", error, imageUrl)
    return null
  }

  if (!response.ok) {
    console.error(
      "Error fetching profile image status:",
      response.status,
      imageUrl,
    )
    // Clear any broken cache
    await cache.delete(absoluteUrl)
    return null
  }

  const blob = await response.blob()
  // Preserve original headers plus timestamp
  const headers = new Headers(response.headers)
  headers.set("time", new Date().toUTCString())
  const stamped = new Response(blob, { headers })

  // Store in cache
  await cache.put(absoluteUrl, stamped.clone())

  return URL.createObjectURL(blob)
}
