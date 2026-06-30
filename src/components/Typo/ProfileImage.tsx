import Image from "next/image"

const defaultThumbnail =
  "https://static.debank.com/image/fuse_token/logo_url/0x495d133b938596c9984d462f007b676bdc57ecec/9c4d096f43ca141571deb30794e69b77.png"

export type ProfileImageProps = {
  width: number
  height: number
  userName?: string
  profileImage?: string
}

export const ProfileImage = ({
  width,
  height,
  userName,
  profileImage,
}: ProfileImageProps) => (
  <Image
    unoptimized
    width={width}
    height={height}
    className="rounded-full"
    alt={userName ?? `user thumbnail`}
    src={profileImage ?? defaultThumbnail}
  />
)
