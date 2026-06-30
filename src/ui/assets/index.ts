import {
  BsArrowLeft,
  BsArrowRepeat,
  BsArrowRight,
  BsBoxArrowUp,
  BsCaretDownFill,
  BsCashStack,
  BsChatTextFill,
  BsCheckCircleFill,
  BsCheckLg,
  BsChevronDown,
  BsChevronLeft,
  BsChevronRight,
  BsChevronUp,
  BsCircleFill,
  BsClock,
  BsClockHistory,
  BsCopy,
  BsExclamationCircleFill,
  BsExclamationTriangle,
  BsExclamationTriangleFill,
  BsFacebook,
  BsFillQuestionCircleFill,
  BsFuelPump,
  BsGearFill,
  BsGlobe,
  BsGoogle,
  BsHandIndex,
  BsInfoCircleFill,
  BsLink45Deg,
  BsPlusCircle,
  BsPlusSquare,
  BsQrCodeScan,
  BsSearch,
  BsThreeDots,
  BsWallet2,
  BsXCircle,
  BsXCircleFill,
  BsXLg,
} from "react-icons/bs"
import { FaCaretDown, FaCaretUp } from "react-icons/fa"
import { HiDotsHorizontal } from "react-icons/hi"
import { IoDocumentOutline } from "react-icons/io5"
import { MdOutlineContactSupport, MdOutlinePrivacyTip } from "react-icons/md"
import { RiArrowDownLine, RiArrowUpLine } from "react-icons/ri"
import { TbCube3dSphere, TbLogout } from "react-icons/tb"

import baseChain from "./chains/baseChain.svg"
import bitcoinChain from "./chains/bitcoinChain.svg"
import bnbChain from "./chains/bnbChain.svg"
import celoChain from "./chains/celoChain.svg"
import dogeChain from "./chains/dogeChain.svg"
import ethChain from "./chains/ethChain.svg"
import fuseChain from "./chains/fuseChain.svg"
import optimismChain from "./chains/optimismChain.svg"
import polygonChain from "./chains/polygonChain.svg"
import solanaChain from "./chains/solanaChain.svg"
import xdcChain from "./chains/xdcChain.svg"
import Legacy from "./icons/legacy.svg"
import Spinner from "./icons/spinner.svg"
import Swap from "./icons/swap.svg"
import Gift from "./illustrations/Gift.svg"
import GoodDollarRain from "./illustrations/GoodDollarRain.png"
import GoodDollarStack from "./illustrations/GoodDollarStack.png"
import Predictions from "./illustrations/predictions.svg"
import Slide1 from "./illustrations/slide1.svg"
import Slide2 from "./illustrations/slide2.svg"
import Slide3 from "./illustrations/slide3.svg"
import Slide4 from "./illustrations/slide4.svg"
import xrpChain from "./illustrations/xrp.svg"
import celoLogo from "./logos/celoLogo.svg"
import goodDollarLogo from "./logos/goodDollarLogo.svg"
import lifiLogo from "./logos/lifiLogo.svg"
import walletConnectLogo from "./logos/walletConnectLogo.svg"
import xdcLogo from "./logos/xdcLogo.svg"

export const UIIcons = {
  ArrowDown: FaCaretDown,
  ArrowUp: FaCaretUp,
  ArrowDownAlt: RiArrowDownLine,
  ArrowUpAlt: RiArrowUpLine,
  BsArrowLeft,
  BsArrowRepeat,
  BsArrowRight,
  BsCaretDownFill,
  BsChevronDown,
  BsChevronLeft,
  BsChevronRight,
  BsChevronUp,
  BsBoxArrowUp,
  BsCopy,
  BsLink45Deg,
  BsPlusCircle,
  BsPlusSquare,
  BsQrCodeScan,
  BsSearch,
  BsCheckCircleFill,
  BsCheckLg,
  BsCircleFill,
  BsExclamationCircleFill,
  BsExclamationTriangle,
  BsExclamationTriangleFill,
  BsInfoCircleFill,
  BsXCircle,
  BsXCircleFill,
  BsXLg,
  BsCashStack,
  BsChatTextFill,
  BsClock,
  BsClockHistory,
  BsFuelPump,
  BsGearFill,
  BsGlobe,
  BsHandIndex,
  BsThreeDots,
  BsWallet2,
  ThreeDots: HiDotsHorizontal,
  BsFacebook,
  BsGoogle,
  AccountsIcon: TbCube3dSphere,
  Cash: BsCashStack,
  Legal: IoDocumentOutline,
  Logout: TbLogout,
  Privacy: MdOutlinePrivacyTip,
  Questionmark: BsFillQuestionCircleFill,
  Support: MdOutlineContactSupport,
  Legacy,
  Predictions,
  Spinner,
  Swap,
} as const

export const ChainIcons = {
  baseChain,
  bitcoinChain,
  bnbChain,
  celoChain,
  dogeChain,
  ethChain,
  fuseChain,
  optimismChain,
  polygonChain,
  solanaChain,
  xdcChain,
  xrpChain,
} as const

export const Logos = {
  xdcLogo,
  celoLogo,
  goodDollarLogo,
  lifiLogo,
  walletConnectLogo,
} as const

export const AllIcons = {
  ...UIIcons,
  ...ChainIcons,
  ...Logos,
} as const

export { Gift, GoodDollarRain, GoodDollarStack, Slide1, Slide2, Slide3, Slide4 }

export type IconName = keyof typeof AllIcons
