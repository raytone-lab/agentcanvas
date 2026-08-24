/**
 * Swappable icon registry.
 *
 * Every state that shows an icon exposes 3-5 interchangeable options so a user
 * can pick the visual language they prefer. An `IconSet` records the chosen
 * option per slot; presets provide quick whole-set swaps, and any single slot
 * can be overridden independently.
 *
 * Icons are pulled from lucide-react (already a project dependency). This module
 * only maps states -> icon component options; tone/color lives in CSS tokens.
 */

import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Ban,
  BadgeCheck,
  Bot,
  Boxes,
  Bug,
  CircleCheck,
  CircleCheckBig,
  CircleDashed,
  CircleDot,
  CircleDotDashed,
  CircleHelp,
  CircleSlash,
  CircleStop,
  CircleX,
  Clock,
  Clock3,
  Cpu,
  CreditCard,
  Diff,
  DollarSign,
  FileDiff,
  FilePen,
  FilePlus,
  FileSearch,
  FileText,
  Gauge,
  HardDrive,
  Hammer,
  Hand,
  History,
  Hourglass,
  Image as ImageIcon,
  Info,
  Layers,
  Lightbulb,
  ListChecks,
  Loader,
  LoaderCircle,
  Lock,
  MessageCircle,
  MessageSquare,
  Music,
  Octagon,
  OctagonAlert,
  Package,
  Pause,
  Pencil,
  Play,
  Plug,
  Power,
  Radio,
  RefreshCw,
  RotateCcw,
  Rss,
  Search,
  SearchCheck,
  Server,
  ServerCog,
  ServerCrash,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  SkipForward,
  Skull,
  Sparkles,
  SquareTerminal,
  Terminal,
  ThumbsDown,
  Timer,
  TimerReset,
  TrafficCone,
  TriangleAlert,
  User,
  UserRound,
  Waypoints,
  WifiOff,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createElement, useId, type ReactNode, type SVGProps } from "react";
import {
  ChatCircle as PhChatCircle,
  Circle as PhCircle,
  Robot as PhRobot,
  Sparkle as PhSparkle,
  User as PhUser,
  UserCircle as PhUserCircle,
  type Icon as PhosphorIconType,
} from "@phosphor-icons/react";

/** Icon rendering weight: line (lucide, the default) or bold (Phosphor, native style). */
export type IconStyle = "line" | "bold";

/** Wrap a Phosphor icon so it renders at bold weight with the usual size/className. */
function boldIcon(Ph: PhosphorIconType): LucideIcon {
  const Wrapped = (props: { size?: number | string; className?: string }) =>
    createElement(Ph, { weight: "bold", size: props.size, className: props.className });
  return Wrapped as unknown as LucideIcon;
}

function ReadFileActionIcon(props: { size?: number | string; className?: string; [key: string]: unknown }) {
  const { size = 36, ...rest } = props;
  return createElement(
    "svg",
    { ...rest, width: size, height: size, viewBox: "0 0 36 36", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
    createElement("path", {
      d: "M26.2727 34C27.5265 34 28.7289 33.4813 29.6154 32.5581C30.5019 31.6348 31 30.3826 31 29.0769V11.424C31 10.7773 30.8777 10.137 30.6401 9.53958C30.4024 8.94216 30.054 8.39934 29.6149 7.94215L25.2942 3.44246C24.8552 2.98513 24.334 2.62236 23.7603 2.37485C23.1866 2.12735 22.5718 1.99998 21.9508 2H9.72727C8.47352 2 7.27112 2.51868 6.38459 3.44194C5.49805 4.36519 5 5.6174 5 6.92308V29.0769C5 30.3826 5.49805 31.6348 6.38459 32.5581C7.27112 33.4813 8.47352 34 9.72727 34H26.2727ZM26.2727 31.5385H9.72727C9.13095 31.5387 8.5566 31.3041 8.11935 30.8819C7.6821 30.4596 7.41427 29.8808 7.36955 29.2615L7.36364 29.0769V6.92308C7.36345 6.30206 7.58866 5.70392 7.99413 5.24856C8.3996 4.79319 8.95536 4.51427 9.55 4.46769L9.72727 4.46154H21.5455V8.15385C21.5454 9.09564 21.8909 10.0019 22.5113 10.6871C23.1317 11.3723 23.9801 11.7847 24.8829 11.84L25.0909 11.8462H28.6364V29.0769C28.6366 29.6979 28.4113 30.2961 28.0059 30.7514C27.6004 31.2068 27.0446 31.4857 26.45 31.5323L26.2727 31.5385ZM27.6566 9.38462H25.0909C24.8014 9.38458 24.5221 9.2739 24.3057 9.07358C24.0894 8.87326 23.9512 8.59723 23.9174 8.29785L23.9091 8.15385V5.48185L27.6566 9.38462ZM23.1185 28.8258C23.3493 29.0268 23.645 29.1285 23.9454 29.1102C24.2457 29.0919 24.5281 28.955 24.7349 28.7274C24.9416 28.4999 25.0573 28.1987 25.0582 27.8854C25.0592 27.5721 24.9453 27.2702 24.7399 27.0412L22.2959 24.3102C23.364 23.0406 23.9381 21.4012 23.9056 19.7136C23.8732 18.026 23.2364 16.4119 22.1203 15.1879C21.0042 13.9639 19.4893 13.2184 17.8726 13.0974C16.256 12.9765 14.6543 13.4889 13.3817 14.5342C12.1091 15.5795 11.2573 17.0823 10.9936 18.7477C10.7298 20.4132 11.0731 22.1211 11.956 23.5367C12.8389 24.9522 14.1977 25.9731 15.766 26.3993C17.3344 26.8254 18.999 26.6259 20.4334 25.84L23.0109 28.72L23.1185 28.8258ZM17.4091 24.1538C16.3121 24.1538 15.26 23.7 14.4842 22.8922C13.7085 22.0843 13.2727 20.9886 13.2727 19.8462C13.2727 18.7037 13.7085 17.608 14.4842 16.8002C15.26 15.9923 16.3121 15.5385 17.4091 15.5385C18.5061 15.5385 19.5582 15.9923 20.3339 16.8002C21.1097 17.608 21.5455 18.7037 21.5455 19.8462C21.5455 20.9886 21.1097 22.0843 20.3339 22.8922C19.5582 23.7 18.5061 24.1538 17.4091 24.1538Z",
      fill: "currentColor",
    }),
  );
}

function ModifiedFileActionIcon(props: { size?: number | string; className?: string; [key: string]: unknown }) {
  const { size = 36, ...rest } = props;
  return createElement(
    "svg",
    { ...rest, width: size, height: size, viewBox: "0 0 36 36", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
    createElement("path", {
      d: "M31.8464 31.44C31.7371 31.6125 31.5856 31.7545 31.4062 31.8524C31.2267 31.9504 31.0252 32.0012 30.8206 32H4.18552C3.98141 32.0017 3.78021 31.9517 3.60079 31.8546C3.42137 31.7574 3.26963 31.6164 3.15979 31.4448C3.05539 31.2792 3 31.0876 3 30.892C3 30.6964 3.05539 30.5048 3.15979 30.3393C3.26915 30.1664 3.42054 30.024 3.59988 29.9253C3.77922 29.8265 3.98068 29.7746 4.18552 29.7744H30.7965C31.0014 29.7719 31.2036 29.8215 31.3839 29.9187C31.5642 30.0158 31.7168 30.1572 31.827 30.3296C31.9364 30.4934 31.9964 30.6851 31.9998 30.8819C32.0033 31.0788 31.95 31.2724 31.8464 31.44ZM18.2603 22.8275C17.016 23.9585 15.4539 24.6814 13.7848 24.8985L10.8818 25.1351C9.48352 25.251 8.71422 25.3137 8.56907 25.3137C8.42198 25.3145 8.27617 25.2864 8.14001 25.2309C8.00385 25.1754 7.88 25.0936 7.77558 24.9903C7.39335 24.6137 7.39335 24.6137 7.62075 21.8958L7.86267 18.9992C8.08033 17.3338 8.80481 15.7752 9.93832 14.5336L20.5827 3.93703C21.219 3.33536 22.0623 3 22.939 3C23.8156 3 24.6589 3.33536 25.2952 3.93703L28.8901 7.52395C29.5127 8.14582 29.8623 8.98882 29.8623 9.86776C29.8623 10.7467 29.5127 11.5897 28.8901 12.2116L18.2603 22.8275ZM27.3177 9.09292L23.7228 5.50601C23.5131 5.30195 23.2319 5.18773 22.939 5.18773C22.6461 5.18773 22.3648 5.30195 22.1552 5.50601L11.5108 16.1268C10.7333 16.9902 10.2284 18.0632 10.0593 19.2116L9.81736 22.1082L9.73995 23.0399L10.6737 22.9627L13.5768 22.7213C14.7271 22.5506 15.802 22.047 16.6685 21.273L27.3128 10.6812C27.5174 10.472 27.6318 10.1914 27.6318 9.89914C27.6318 9.60691 27.5174 9.32625 27.3128 9.11706L27.3177 9.09292Z",
      fill: "currentColor",
      stroke: "currentColor",
      strokeWidth: "0.5",
    }),
  );
}

const FileReadAction = ReadFileActionIcon as unknown as LucideIcon;
const FileModifiedAction = ModifiedFileActionIcon as unknown as LucideIcon;

function UserFirstAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  const maskId = useId();
  const bgGradientId = useId();
  return (
    <svg
      {...rest}
      className={["user-first-avatar custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <circle cx="24" cy="24" r="24" fill={`url(#${bgGradientId})`} />
      <mask id={maskId} style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <circle cx="24" cy="24" r="23.5" fill="#A07E63" stroke="#D1D5E3" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path
          d="M23.8142 8.56821C24.6239 8.56822 25.4265 8.65917 26.2224 8.84067C27.0199 9.02254 27.7682 9.26678 28.4666 9.57407C29.1656 9.88166 29.7866 10.2309 30.3298 10.6209C30.8743 11.0118 31.2967 11.4007 31.5994 11.786L31.6003 11.787C32.3253 12.6792 32.8549 13.6615 33.1892 14.7342C33.4839 15.6798 33.7024 16.5871 33.8464 17.4559L33.9041 17.826C34.0443 18.9483 34.114 20.0847 34.114 21.2352V21.286L34.155 21.3153C34.2928 21.4137 34.4087 21.5342 34.5027 21.6776L34.5896 21.8289L34.5925 21.8338C34.6988 22.02 34.7872 22.2636 34.8562 22.5672C34.9233 22.8624 34.9312 23.2308 34.8757 23.6747V23.6776C34.82 24.2625 34.7023 24.7215 34.5271 25.0584C34.3927 25.317 34.2476 25.5298 34.0935 25.6991L33.9363 25.8543C33.6917 26.0717 33.4359 26.2188 33.1697 26.2987L33.1189 26.3143L33.1042 26.3651C32.9641 26.8415 32.8234 27.2896 32.6833 27.7098C32.5438 28.0727 32.3834 28.4292 32.2019 28.7782C32.0237 29.1208 31.8274 29.3833 31.615 29.5702C31.0791 29.9933 30.6413 30.3539 30.3015 30.6512C29.9393 30.9681 29.7081 31.4934 29.5935 32.2059C29.5073 32.6371 29.4788 33.0762 29.5076 33.5213C29.5367 33.9717 29.6597 34.4205 29.8757 34.867C30.0936 35.3173 30.4267 35.7432 30.8708 36.1444C31.2633 36.4988 31.7903 36.8171 32.449 37.1004L32.739 37.2196C33.4473 37.5029 34.2192 37.757 35.0535 37.9832C35.8816 38.2078 36.6885 38.4679 37.4744 38.7625C38.2561 39.0557 38.9458 39.4185 39.5437 39.8495C40.1316 40.2733 40.55 40.8547 40.7976 41.5975V41.5965C40.9359 42.0392 41.0401 42.5891 41.1101 43.2469C41.1802 43.9055 41.2156 44.5712 41.2156 45.244C41.2156 45.9154 41.1667 46.544 41.0691 47.1297C40.9717 47.7143 40.8269 48.1501 40.6404 48.4442C40.5837 48.5222 40.466 48.6112 40.2712 48.7069C40.0773 48.8021 39.8172 48.8991 39.489 48.9969C38.8311 49.1929 38.0168 49.3825 37.0466 49.5653C36.0773 49.7479 34.995 49.91 33.7996 50.0506C32.6031 50.1914 31.3988 50.3105 30.1882 50.409C28.9777 50.5076 27.8166 50.5852 26.7048 50.6414C25.5929 50.6977 24.6292 50.7254 23.8142 50.7254C22.9992 50.7254 22.0493 50.6977 20.9656 50.6414C19.882 50.5852 18.7632 50.5075 17.6091 50.409C16.4547 50.3105 15.3071 50.1978 14.1667 50.0711C13.0265 49.9444 11.9916 49.8104 11.0632 49.6698C10.1349 49.5291 9.34819 49.3891 8.70288 49.2489C8.38108 49.1789 8.12086 49.1095 7.92163 49.0409C7.71987 48.9713 7.58868 48.9052 7.51831 48.8465L7.51733 48.8456L7.42944 48.7538C7.34191 48.6408 7.2557 48.4614 7.17456 48.2049C7.06781 47.8674 6.97531 47.4125 6.89819 46.8377C6.74496 45.6954 6.80655 44.2118 7.08765 42.3846V42.3827C7.22585 41.3602 7.63188 40.5893 8.29858 40.0584C8.97968 39.5163 9.77379 39.0843 10.6804 38.7635C11.5933 38.4405 12.5417 38.1522 13.5251 37.8993C14.5197 37.6435 15.4023 37.2729 16.1726 36.7879C16.7683 36.4192 17.2275 36.0618 17.5457 35.7147C17.8612 35.3704 18.0938 35.0233 18.24 34.6727C18.3858 34.3227 18.4587 33.9572 18.4587 33.578C18.4587 33.2093 18.445 32.7988 18.4167 32.3465V32.3436L18.3865 32.0995C18.2973 31.5443 18.0734 31.0888 17.7107 30.7391C17.3146 30.3572 16.8763 29.9685 16.3962 29.5731H16.3972C16.1843 29.3867 15.9939 29.1239 15.8289 28.7801C15.6616 28.4316 15.5084 28.0761 15.3689 27.7137C15.2285 27.2924 15.0876 26.843 14.947 26.3651L14.9314 26.3133L14.8796 26.2987L14.741 26.2508C14.6031 26.1966 14.4637 26.1203 14.323 26.0204C14.1615 25.8856 13.9831 25.6949 13.7888 25.4452C13.6021 25.205 13.4377 24.8509 13.2986 24.3778L13.2966 24.3729C13.1313 23.9042 13.0709 23.4826 13.1111 23.1063C13.1527 22.7181 13.2291 22.3884 13.3376 22.117L13.3386 22.1141C13.4465 21.8176 13.6225 21.5324 13.8689 21.2586L13.8953 21.2293L13.8943 21.1913C13.8662 20.1257 13.9221 19.0597 14.0623 17.994V17.993C14.1743 17.097 14.3778 16.1294 14.6726 15.0907C14.9656 14.0584 15.4045 13.139 15.989 12.3319L15.991 12.3299C16.5212 11.5486 17.1122 10.9152 17.7644 10.4295C18.4207 9.94081 19.0902 9.55751 19.7722 9.27914C20.4556 9.00024 21.1382 8.8121 21.8201 8.71469C22.3348 8.64117 22.8374 8.59535 23.3279 8.577L23.8142 8.56821Z"
          fill="var(--avatar-fg, #A9B2C7)"
          stroke="var(--avatar-stroke, #D1D5E3)"
          strokeWidth="0.195312"
        />
      </g>
      <defs>
        <linearGradient id={bgGradientId} x1="8" y1="7" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--user-first-avatar-bg-start, var(--avatar-bg, #E6E9F0))" />
          <stop offset="1" stopColor="var(--user-first-avatar-bg-end, var(--avatar-bg, #E6E9F0))" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AssistantSecondAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  const maskId = useId();
  return (
    <svg
      {...rest}
      className={["custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <circle cx="24" cy="24" r="24" fill="var(--avatar-bg, #E6E9F0)" />
      <mask id={maskId} style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <circle cx="24" cy="24" r="24" fill="var(--avatar-bg, #E6E9F0)" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path d="M-0.582092 25.3061C-0.582092 38.7258 10.2988 49.5971 23.709 49.5971C37.1287 49.5971 48 38.7163 48 25.3061C48 11.8863 37.1191 1.01502 23.709 1.01502C10.2988 1.00548 -0.582092 11.8863 -0.582092 25.3061Z" fill="var(--avatar-bg, #E6E9F0)" />
        <path d="M27.5745 9.65295H22.0005C20.4447 9.65295 19.0035 10.4547 18.1826 11.7719C15.6724 11.791 13.6489 13.824 13.6489 16.3342V19.3694C13.668 21.8796 15.701 23.9126 18.2113 23.9222H29.4262C31.9173 23.9126 33.9217 21.8987 33.9408 19.4076V16.0288C33.9312 12.5068 31.0869 9.6625 27.5745 9.65295Z" fill="var(--avatar-fg, #A9B2C7)" />
        <path d="M23.709 49.5971C29.6075 49.6067 35.3057 47.4591 39.7248 43.5649L39.3908 41.4842C39.3812 37.8859 36.4606 34.9652 32.8622 34.9557H14.7275C11.1292 34.9652 8.2085 37.8859 8.19895 41.4842L7.85535 43.689C12.2554 47.5069 17.8867 49.5971 23.709 49.5971Z" fill="var(--avatar-fg-muted, var(--avatar-fg, #BFC5D2))" />
        <path d="M24.0812 39.4894H23.5085C21.3228 39.4894 18.9653 37.7046 18.9653 35.5188L19.5379 28.1409C19.5475 25.9551 21.3132 24.1798 23.5085 24.1703H24.0716C26.2669 24.1798 28.0422 25.9456 28.0422 28.1409L28.6053 35.5188C28.6149 37.7046 26.2669 39.4894 24.0812 39.4894Z" fill="var(--avatar-cutout, #F8FCFF)" />
        <path d="M28.3381 31.9014L28.0517 28.1504C28.0422 25.9647 26.2669 24.1894 24.0812 24.1798H23.5085C21.3228 24.1894 19.5475 25.9647 19.5379 28.1504L18.9653 35.5284C18.9653 36.0724 19.1084 36.6164 19.3757 37.0937C19.662 37.1223 19.9484 37.1414 20.2347 37.1414H21.0842C24.3866 37.1223 27.2977 35.013 28.3381 31.9014Z" fill="var(--avatar-fg-muted, var(--avatar-fg, #BFC5D2))" />
        <path d="M17.8104 16.9736H29.7698C30.9151 16.9736 31.8505 17.909 31.8505 19.0544V26.3465C31.8505 28.3699 31.0487 30.317 29.6171 31.7487C28.1854 33.1804 26.2478 33.9821 24.2148 33.9821H23.3558C21.3323 33.9821 19.3852 33.1804 17.9535 31.7487C16.5218 30.317 15.7201 28.3795 15.7201 26.3465V19.0544C15.7296 17.909 16.665 16.9736 17.8104 16.9736Z" fill="var(--avatar-cutout, #EFF1F6)" />
      </g>
    </svg>
  );
}

function UserThirdAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  const maskId = useId();
  return (
    <svg
      {...rest}
      className={["custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <circle cx="24" cy="24" r="24" fill="var(--avatar-bg, #E6E9F0)" />
      <mask id={maskId} style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <circle cx="24" cy="24" r="24" fill="var(--avatar-bg, #E6E9F0)" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path d="M17.6457 10.651C17.6936 10.6238 17.7412 10.5954 17.7893 10.5688C17.741 10.5954 17.6941 10.6242 17.6457 10.651ZM23.9638 9.13656C23.8103 9.12976 23.6567 9.12589 23.503 9.12494C23.3418 9.12494 23.1817 9.13075 23.0219 9.13718C23.1782 9.13864 23.333 9.14383 23.4854 9.15441C23.6446 9.14341 23.8042 9.13746 23.9638 9.13656ZM16.9944 11.0443C17.1024 10.9746 17.2103 10.9046 17.3197 10.8386C17.2097 10.9048 17.1021 10.9746 16.9944 11.0443ZM16.6522 11.2732C16.7086 11.2342 16.7643 11.1933 16.8209 11.1553C16.7641 11.1937 16.7086 11.234 16.6522 11.2732ZM28.1425 10.0549C29.3791 10.5922 30.5243 11.3194 31.5366 12.2101C30.5344 11.3061 29.3869 10.5775 28.1425 10.0549ZM21.523 16.2678C19.2162 20.3172 15.3073 23.9052 11.5057 21.5334C11.7176 27.9789 17.0061 33.1397 23.503 33.1397C30.0021 33.1397 35.2919 27.9749 35.5003 21.5263C32.3251 23.508 23.9951 20.6374 21.523 16.2678Z" fill="var(--avatar-cutout, #EFF1F6)" />
        <path d="M29.153 34.0586C29.1573 34.0576 29.1621 34.0557 29.1663 34.0551C29.1933 34.0647 29.2204 34.074 29.2472 34.0837C29.1749 34.0576 29.1024 34.0319 29.0297 34.0067C29.0718 34.0213 29.1136 34.0366 29.1555 34.0514C29.1544 34.0536 29.154 34.0561 29.153 34.0586ZM29.4027 34.1427C30.2629 35.0382 29.3549 42.2622 27.986 41.2992L25.7445 39.7225L23.4972 38.14L21.2557 39.7225L19.0084 41.2992C17.6482 42.256 16.7294 35.1347 17.5583 34.1618C13.3178 35.7651 10.2052 39.0787 8.95189 43.4429C13.0789 46.3151 18.094 48 23.503 48C28.9143 48 33.9311 46.3137 38.0591 43.4396C36.8 39.0598 33.6681 35.7379 29.4027 34.1427ZM17.978 34.0082C17.9072 34.0325 17.8369 34.0574 17.7667 34.0827L17.8296 34.0605C17.8383 34.0626 17.847 34.0644 17.8559 34.0673L17.8512 34.053C17.8935 34.0381 17.9354 34.0229 17.978 34.0082Z" fill="var(--avatar-fg-muted, var(--avatar-fg, #BFC5D2))" />
        <path d="M23.503 38.04C23.4513 38.04 23.4005 38.0373 23.3492 38.0361L23.497 38.14L23.6448 38.0363C23.5976 38.0375 23.5505 38.04 23.503 38.04ZM19.911 33.4728C19.9768 33.4589 20.0435 33.4464 20.1099 33.4334C20.0437 33.4464 19.977 33.4589 19.911 33.4728ZM25.4954 33.2125C25.5679 33.2208 25.6393 33.231 25.7115 33.2401C25.6393 33.2308 25.5679 33.2208 25.4954 33.2125ZM18.4236 33.8621C18.4858 33.8426 18.5477 33.8225 18.6102 33.8036C18.5475 33.8225 18.4858 33.8428 18.4236 33.8621Z" fill="var(--avatar-fg, #D5E270)" />
        <path d="M23.645 38.0365L25.7445 36.5635L28.9743 34.1456C29.0384 34.0981 29.0978 34.0705 29.153 34.0587L29.1557 34.0514C29.1138 34.0367 29.072 34.0213 29.0299 34.0068C28.8862 33.9575 28.7418 33.9102 28.5968 33.8648C28.5302 33.8439 28.4639 33.8223 28.3971 33.8024C28.1863 33.739 27.9742 33.6799 27.761 33.6251L27.744 33.621C27.5318 33.5675 27.3186 33.5183 27.1045 33.4734C27.0346 33.4587 26.9638 33.4454 26.8935 33.4315C26.6596 33.3851 26.4248 33.3435 26.1893 33.3068C26.0304 33.2822 25.8712 33.2599 25.7117 33.2399C25.6395 33.2308 25.5681 33.2206 25.4956 33.2123C25.2634 33.1854 25.0307 33.163 24.7977 33.1451H22.215C21.9812 33.1631 21.7478 33.1855 21.515 33.2125C21.4448 33.2206 21.3753 33.2304 21.3053 33.2391C21.1422 33.2599 20.9801 33.2823 20.8191 33.3072C20.5819 33.3441 20.3456 33.3861 20.1103 33.4332C20.0441 33.4462 19.9775 33.4587 19.9115 33.4726C19.4735 33.5649 19.0395 33.6753 18.6106 33.8034C18.5479 33.8223 18.4861 33.8424 18.424 33.8619C18.2742 33.9088 18.1256 33.957 17.9784 34.008C17.9359 34.0226 17.8939 34.0379 17.8516 34.0529L17.8564 34.0672C17.9024 34.0817 17.951 34.1068 18.0027 34.1452L21.2559 36.5631L23.3494 38.0359C23.4007 38.0371 23.4515 38.0398 23.5032 38.0398C23.5505 38.04 23.5977 38.0375 23.645 38.0365Z" fill="var(--avatar-detail, #FEFEFE)" />
        <path d="M21.5231 16.2678C23.9951 20.6375 32.3251 23.508 35.5003 21.5264L35.5103 21.5206C35.7228 17.5451 33.9749 14.3561 31.5369 12.2101C30.5245 11.3195 29.3793 10.5923 28.1427 10.055C26.7332 9.44502 25.2862 9.12727 23.9638 9.13661C23.8025 9.13765 23.6429 9.14346 23.4854 9.15446C23.8982 10.6247 23.0713 13.55 21.5231 16.2678Z" fill="var(--avatar-fg, #A9B2C7)" />
        <path d="M21.5231 16.2677C23.0713 13.55 23.8982 10.6248 23.4854 9.15437C23.3311 9.1439 23.1766 9.13816 23.0219 9.13715C21.368 9.12262 19.5173 9.62218 17.7895 10.569C17.7414 10.5954 17.6939 10.624 17.6459 10.6512C17.537 10.7126 17.4278 10.7734 17.3199 10.8386C17.2105 10.9046 17.1026 10.9745 16.9946 11.0443C16.937 11.0814 16.8786 11.1171 16.8213 11.1553C16.7645 11.1933 16.7089 11.2342 16.6526 11.2732C13.6183 13.369 11.2376 16.9161 11.4839 21.5205C11.4912 21.525 11.4985 21.5288 11.5057 21.5333C15.3073 23.9052 19.2162 20.3171 21.5231 16.2677Z" fill="var(--avatar-fg-muted, var(--avatar-fg, #BFC5D2))" />
      </g>
    </svg>
  );
}

function UserFourthAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...rest}
      className={["custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <circle cx="24" cy="24" r="24" fill="var(--avatar-bg, #E6E9F0)" />
      <path
        d="M24.5 7.2C33.7 7.2 33.7 14.1 33.7 18C33.7 21.9 30.1 29.1 24.5 29.3C19.1 29.3 15.4 22.1 15.4 18C15.4 14.1 15.4 7.2 24.5 7.2Z"
        fill="var(--avatar-fg, #A9B2C7)"
      />
      <path
        d="M24 46.7C17 46.7 10.7 43.5 6.5 38.6C7.1 37.1 7.9 35.4 8.9 34.5C11.2 32.7 17.9 29.7 17.9 29.7L22.1 37.8L22.9 35.9L21.7 33.5L24.1 31.1L26.5 33.5L25.4 36L26 38L30.4 30C30.4 30 37.1 33 39.4 34.8C40.4 35.6 41.2 36.9 41.6 38.1C37.6 43.4 31.1 46.7 24 46.7Z"
        fill="var(--avatar-fg, #A9B2C7)"
      />
      <path d="M22.1 37.8L17.9 29.7L21.7 33.5L22.9 35.9L22.1 37.8Z" fill="var(--avatar-detail, #FFFFFF)" />
      <path d="M26 38L30.4 30L26.5 33.5L25.4 36L26 38Z" fill="var(--avatar-detail, #FFFFFF)" />
    </svg>
  );
}

type MoodAvatarVariant =
  | "excited"
  | "joyful"
  | "grateful"
  | "energized"
  | "sensitive"
  | "confused"
  | "bored"
  | "stressed"
  | "angry"
  | "insecure"
  | "hurt"
  | "guilty";

function MoodAvatar({
  variant,
  size = 48,
  ...rest
}: {
  variant: MoodAvatarVariant;
  size?: number | string;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...rest}
      className={["custom-avatar-face mood-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <g transform="translate(24 24) scale(1.22) translate(-24 -24)">
        {moodAvatarShape(variant)}
        <g
          stroke="#171717"
          strokeWidth="2.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {moodAvatarExpression(variant)}
        </g>
      </g>
    </svg>
  );
}

function moodAvatarShape(variant: MoodAvatarVariant) {
  switch (variant) {
    case "excited":
      return <circle cx="24" cy="24" r="19" fill="#F48AC2" />;
    case "joyful":
      return (
        <>
          <circle cx="17" cy="16" r="11" fill="#F260AD" />
          <circle cx="31" cy="16" r="11" fill="#F260AD" />
          <circle cx="17" cy="32" r="11" fill="#F260AD" />
          <circle cx="31" cy="32" r="11" fill="#F260AD" />
          <circle cx="24" cy="24" r="12" fill="#F260AD" />
        </>
      );
    case "grateful":
      return <path d="M13 9H35C39.4 9 42 13.2 42 18.2C42 21.7 40.4 24.1 38.2 25.4C40.3 26.8 41.6 29.1 41.6 32.1C41.6 36.6 38.1 40 33.5 40H14.4C9.6 40 6 36.2 6 31.5C6 28.6 7.3 26.4 9.4 25C7.2 23.5 6 21 6 18C6 12.9 9.4 9 13 9Z" fill="#A566D0" />;
    case "energized":
      return <path d="M12 15.6C12 10.9 15.8 8.1 19.2 10.8C20.5 6.9 25.2 6.9 27 10.7C29.2 6.8 34.4 8.2 34.8 12.8C38 10 42 12.7 42 17.2V31.6C42 37 38.5 41 32.8 41H19.5C14.7 41 10.8 37.1 10.8 32.3V17.2C10.8 16.6 11.2 16 12 15.6Z" fill="#A986D2" />;
    case "sensitive":
      return <path d="M6 24.4C6 14.2 14 7.5 24 7.5C34 7.5 42 14.2 42 24.4V33.2C42 38.5 38.6 41.5 33.6 41.5H14.4C9.4 41.5 6 38.5 6 33.2V24.4Z" fill="#17A8E8" />;
    case "confused":
      return <path d="M17 9H31C32.5 9 33.9 9.8 34.7 11.1L41.7 23.1C42.5 24.3 42.5 25.8 41.7 27.1L34.7 38.9C33.9 40.2 32.5 41 31 41H17C15.5 41 14.1 40.2 13.3 38.9L6.3 27.1C5.5 25.8 5.5 24.3 6.3 23.1L13.3 11.1C14.1 9.8 15.5 9 17 9Z" fill="#126EEA" />;
    case "bored":
      return <circle cx="24" cy="24" r="18.5" fill="#06954B" />;
    case "stressed":
      return <path d="M24 8.5C25.7 8.5 27.2 9.4 28 10.9L43 37.2C44.1 39.2 42.7 41.5 40.4 41.5H7.6C5.3 41.5 3.9 39.2 5 37.2L20 10.9C20.8 9.4 22.3 8.5 24 8.5Z" fill="#0FAF62" />;
    case "angry":
      return <rect x="8" y="8" width="32" height="32" rx="6" fill="#FB530B" />;
    case "insecure":
      return <circle cx="24" cy="24" r="18.5" fill="#FF7A09" />;
    case "hurt":
      return (
        <>
          <rect x="8" y="10" width="32" height="8" rx="4" fill="#FF9F0A" />
          <rect x="8" y="18" width="32" height="8" rx="4" fill="#FF9F0A" />
          <rect x="8" y="26" width="32" height="8" rx="4" fill="#FF9F0A" />
          <rect x="8" y="34" width="32" height="8" rx="4" fill="#FF9F0A" />
        </>
      );
    case "guilty":
      return <path d="M9 39C9.2 21.2 20.9 9.4 38 8.3C40.2 8.2 42 9.9 42 12.1V39H9Z" fill="#FDBA18" />;
  }
}

function moodAvatarExpression(variant: MoodAvatarVariant) {
  switch (variant) {
    case "excited":
      return (
        <>
          <path d="M15.8 20.7C17.6 23.2 20.1 23.2 21.8 20.7" />
          <path d="M26.2 20.7C27.9 23.2 30.4 23.2 32.2 20.7" />
          <path d="M14 28.1C19.4 33 28.6 33 34 28.1" />
        </>
      );
    case "joyful":
      return (
        <>
          <path d="M16.5 22C18.1 24.4 20.5 24.4 22 22" />
          <path d="M26 22C27.5 24.4 29.9 24.4 31.5 22" />
          <path d="M17.5 28.4C21.2 33.2 27 33.2 30.6 28.4" />
        </>
      );
    case "grateful":
      return (
        <>
          <path d="M17.3 20.8C18.9 23 21.2 23 22.7 20.8" />
          <path d="M25.4 20.8C26.9 23 29.2 23 30.8 20.8" />
          <path d="M16.8 28.8C21.4 32.4 27.7 32.4 32.2 28.8" />
        </>
      );
    case "energized":
      return (
        <>
          <path d="M17 20.6C18.5 22.9 20.8 22.9 22.3 20.6" />
          <path d="M25.7 20.6C27.2 22.9 29.5 22.9 31 20.6" />
          <path d="M21 28.5C23.1 31.3 26 31.3 28.1 28.5" />
        </>
      );
    case "sensitive":
      return (
        <>
          <path d="M15.8 22.4C17.4 24.6 19.6 24.6 21.2 22.4" />
          <path d="M26.8 22.4C28.4 24.6 30.6 24.6 32.2 22.4" />
          <path d="M17.6 26.8V30.4" stroke="#FFFFFF" />
        </>
      );
    case "confused":
      return (
        <>
          <circle cx="18.5" cy="23.2" r="3" fill="#FFFFFF" stroke="none" />
          <circle cx="18.5" cy="23.2" r="1.35" fill="#171717" stroke="none" />
          <circle cx="29.2" cy="23.2" r="4.6" fill="#FFFFFF" stroke="none" />
          <path d="M29.2 19.5C34.4 19.5 34.4 27 29.2 27C25.6 27 25.6 22.1 29.2 22.1C31.6 22.1 31.6 25 29.2 25" stroke="#FF8A00" strokeWidth="1.8" />
        </>
      );
    case "bored":
      return (
        <>
          <ellipse cx="18.8" cy="22.4" rx="5" ry="4" fill="#FFFFFF" stroke="none" />
          <ellipse cx="29.2" cy="22.4" rx="5" ry="4" fill="#FFFFFF" stroke="none" />
          <circle cx="20.2" cy="19.8" r="2.4" fill="#171717" stroke="none" />
          <circle cx="30.6" cy="19.8" r="2.4" fill="#171717" stroke="none" />
        </>
      );
    case "stressed":
      return (
        <>
          <path d="M15.2 25.6L21.5 22.5" />
          <path d="M32.8 25.6L26.5 22.5" />
          <path d="M20.2 31.8H27.8" />
        </>
      );
    case "angry":
      return (
        <>
          <path d="M15.3 21.7H23.4C23.1 25.1 19.2 25.9 16.2 24.9" fill="#FFFFFF" stroke="none" />
          <path d="M24.6 21.7H32.7C31.8 25 27.9 25.5 25.3 24.2" fill="#FFFFFF" stroke="none" />
          <path d="M18 30.5H30" />
        </>
      );
    case "insecure":
      return (
        <>
          <ellipse cx="18.5" cy="23.8" rx="5.1" ry="4.6" fill="#FFFFFF" stroke="none" />
          <rect x="25" y="20" width="10" height="7.6" rx="1" fill="#FFFFFF" stroke="none" />
          <circle cx="20.5" cy="23.7" r="3.2" fill="#171717" stroke="none" />
          <rect x="26" y="20.8" width="4.6" height="6" rx="1" fill="#171717" stroke="none" />
        </>
      );
    case "hurt":
      return (
        <>
          <path d="M17.4 23C18.9 25.1 21.1 25.1 22.6 23" />
          <path d="M25.4 23C26.9 25.1 29.1 25.1 30.6 23" />
          <path d="M21.2 30.2H27" />
        </>
      );
    case "guilty":
      return (
        <>
          <path d="M17 25.6C19 21.8 24.6 20.9 29.2 23.4" fill="#FFFFFF" stroke="none" />
          <path d="M26.2 24.4C29.5 19.7 35.1 19.4 38.5 22.7" fill="#FFFFFF" stroke="none" />
          <circle cx="23.8" cy="23.8" r="2.8" fill="#171717" stroke="none" />
          <circle cx="34.1" cy="22.2" r="2.8" fill="#171717" stroke="none" />
        </>
      );
  }
}

function SolidFaceAvatar({
  size = 48,
  className,
  fill,
  children,
  ...rest
}: {
  size?: number | string;
  className?: string;
  fill: string;
  children: ReactNode;
} & Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg
      {...rest}
      className={["custom-avatar-face", className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
    >
      <circle cx="40" cy="40" r="40" fill={fill} />
      {children}
    </svg>
  );
}

function UserBlueSmileAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  return (
    <SolidFaceAvatar
      {...rest}
      className={["user-blue-smile-avatar", rest.className].filter(Boolean).join(" ")}
      size={size}
      fill="var(--user-blue-smile-bg, #A8CBEF)"
    >
      <g className="user-blue-smile-features">
        <path
          className="user-blue-smile-mouth"
          d="M57.0107 34.0281C53.6738 40.1887 47.8145 44.9184 40.4721 46.5641C34.4022 47.9245 28.3494 46.9463 23.2433 44.2235"
          stroke="#00055C"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle className="user-blue-smile-eye" cx="24.6248" cy="30.6263" r="3.23079" transform="rotate(-6.74047 24.6248 30.6263)" fill="#00055C" />
        <circle className="user-blue-smile-eye" cx="47.7742" cy="24.637" r="3.23079" transform="rotate(-6.74047 47.7742 24.637)" fill="#00055C" />
      </g>
    </SolidFaceAvatar>
  );
}

function UserGoldenJoyAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  return (
    <SolidFaceAvatar
      {...rest}
      className={["user-golden-joy-avatar", rest.className].filter(Boolean).join(" ")}
      size={size}
      fill="#FCC764"
    >
      <path className="user-golden-joy-eye" d="M22 36C22 36 23.4694 34 26 34C28.5306 34 30 36 30 36" stroke="#161211" strokeWidth="3" strokeLinecap="round" />
      <path className="user-golden-joy-eye" d="M50 36C50 36 51.4694 34 54 34C56.5306 34 58 36 58 36" stroke="#161211" strokeWidth="3" strokeLinecap="round" />
      <path className="user-golden-joy-mouth" d="M26 48C26 48 31.1429 54 40 54C48.8571 54 54 48 54 48" stroke="#161211" strokeWidth="3" strokeLinecap="round" />
    </SolidFaceAvatar>
  );
}

function UserGreenCalmAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  return (
    <SolidFaceAvatar
      {...rest}
      className={["user-green-calm-avatar", rest.className].filter(Boolean).join(" ")}
      size={size}
      fill="#C0C96C"
    >
      <circle className="user-green-calm-eye" cx="51.5877" cy="27.5877" r="3.23079" transform="rotate(-6.74047 51.5877 27.5877)" fill="black" fillOpacity="0.84" />
      <circle className="user-green-calm-eye" cx="28.5877" cy="27.5877" r="3.23079" transform="rotate(-6.74047 28.5877 27.5877)" fill="black" fillOpacity="0.84" />
      <rect className="user-green-calm-mouth" x="30" y="38" width="20" height="4" rx="2" fill="black" fillOpacity="0.84" />
    </SolidFaceAvatar>
  );
}

function UserPurpleBoredAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  return (
    <SolidFaceAvatar
      {...rest}
      className={["user-purple-bored-avatar", rest.className].filter(Boolean).join(" ")}
      size={size}
      fill="#C8AAE0"
    >
      <ellipse className="user-purple-bored-eye-white" cx="26.5" cy="35" rx="10.5" ry="11" fill="white" />
      <ellipse className="user-purple-bored-eye-white" cx="56.5" cy="35" rx="10.5" ry="11" fill="white" />
      <ellipse className="user-purple-bored-pupil" cx="29.5" cy="31" rx="5.5" ry="6" fill="#00055C" />
      <ellipse className="user-purple-bored-pupil" cx="59.5" cy="31" rx="5.5" ry="6" fill="#00055C" />
    </SolidFaceAvatar>
  );
}

function UserHeartEyesAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  return (
    <SolidFaceAvatar
      {...rest}
      className={["user-heart-eyes-avatar", rest.className].filter(Boolean).join(" ")}
      size={size}
      fill="#FFB0A2"
    >
      <path className="user-heart-eye" d="M18.0182 6.13189C21.9912 4.75218 25.625 6.999 27.0884 11.213C28.224 14.4831 26.4638 19.1301 21.9371 25.2369C21.6396 25.6373 21.2264 25.94 20.7525 26.1045C20.2787 26.2691 19.7668 26.2876 19.2852 26.1578C11.9478 24.1711 7.68636 21.6152 6.55074 18.3451C5.08734 14.1311 6.54641 10.1157 10.5194 8.736C11.9542 8.23773 13.0986 8.39251 14.8282 9.04466C15.7816 7.46104 16.5834 6.63016 18.0182 6.13189Z" fill="#FB715A" />
      <path className="user-heart-eye" d="M61.0033 6.13189C57.0303 4.75218 53.3965 6.999 51.9331 11.213C50.7975 14.4831 52.5577 19.1301 57.0844 25.2369C57.3819 25.6373 57.7951 25.94 58.2689 26.1045C58.7428 26.2691 59.2547 26.2876 59.7363 26.1578C67.0736 24.1711 71.3351 21.6152 72.4707 18.3451C73.9341 14.1311 72.4751 10.1157 68.5021 8.736C67.0673 8.23773 65.9229 8.39251 64.1933 9.04466C63.2399 7.46104 62.4381 6.63016 61.0033 6.13189Z" fill="#FB715A" />
      <path className="user-heart-mouth" d="M31 32C31 32 34.6735 35 41 35C47.3265 35 51 32 51 32" stroke="#161211" strokeWidth="3" strokeLinecap="round" />
    </SolidFaceAvatar>
  );
}

function AgentFirstAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  const bgGradientId = useId();
  return (
    <svg
      {...rest}
      className={["agent-first-avatar custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <circle cx="24" cy="24" r="24" fill={`url(#${bgGradientId})`} />
      <rect x="9" y="15" width="30" height="18" rx="9" fill="var(--avatar-fg, #BFC5D2)" />
      <g className="agent-first-avatar-eyes">
        <rect x="17" y="21" width="3" height="6" rx="1.5" fill="var(--avatar-eye, #FFFFFF)" />
        <rect x="28" y="21" width="3" height="6" rx="1.5" fill="var(--avatar-eye, #FFFFFF)" />
      </g>
      <defs>
        <linearGradient id={bgGradientId} x1="8" y1="7" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--agent-first-avatar-bg-start, var(--avatar-bg, #E6E9F0))" />
          <stop offset="1" stopColor="var(--agent-first-avatar-bg-end, var(--avatar-bg, #E6E9F0))" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AgentOrangeBlobAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  const maskId = useId();

  return (
    <svg
      {...rest}
      className={["agent-orange-blob-avatar custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
    >
      <circle cx="16" cy="16" r="16" fill="var(--agent-orange-blob-bg, #10264A)" />
      <mask id={maskId} style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
        <circle cx="16" cy="16" r="16" fill="white" />
      </mask>
      <g className="agent-orange-blob-avatar-glyph" mask={`url(#${maskId})`}>
        <path
          d="M15.8667 5.96941C18.6028 5.96947 20.8207 8.18745 20.8208 10.9235C20.8208 12.2428 20.3032 13.44 19.4624 14.3278L23.9253 24.4694C25.052 27.0299 23.89 30.0193 21.3296 31.1462L5.30909 38.196C2.74842 39.3227 -0.240899 38.16 -1.36767 35.5993L-5.91161 25.2741C-6.90819 23.0093 -6.1135 20.4094 -4.14501 19.0592C-4.78437 18.1414 -5.16063 17.0263 -5.16063 15.8229C-5.16063 12.6917 -2.62193 10.1532 0.509287 10.153C3.18074 10.153 5.41967 12.0009 6.02003 14.488L11.0942 12.2555C10.9762 11.8317 10.9126 11.385 10.9126 10.9235C10.9127 8.18741 13.1306 5.96941 15.8667 5.96941Z"
          fill="var(--agent-orange-blob-body, #FA8352)"
        />
        <g className="agent-orange-blob-avatar-eyes">
          <path d="M8.75401 20.656C8.59066 19.9185 9.0356 19.1827 9.76466 18.9847C10.5229 18.7788 11.3036 19.2301 11.5036 19.9899L12.2319 22.7559C12.4409 23.5497 11.9601 24.3609 11.1634 24.5586C10.3606 24.7579 9.55132 24.2564 9.37246 23.4487L8.75401 20.656Z" fill="var(--agent-orange-blob-eye, #FFF7D8)" />
          <path d="M14.6511 18.8816C14.4006 18.2215 14.7244 17.4823 15.3795 17.219C16.0326 16.9564 16.7759 17.263 17.0539 17.9097L18.0667 20.2655C18.3646 20.9585 18.0377 21.7612 17.3404 22.049C16.6363 22.3395 15.8313 21.9912 15.561 21.2791L14.6511 18.8816Z" fill="var(--agent-orange-blob-eye, #FFF7D8)" />
        </g>
      </g>
    </svg>
  );
}

function AgentSparkAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  const glowGradientId = useId();
  const glowFilterId = useId();
  const fillMainId = useId();
  const fillSmallId = useId();

  return (
    <svg
      {...rest}
      className={["agent-spark-avatar custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 47 57"
      fill="none"
      overflow="visible"
    >
      <g className="agent-spark-avatar-glow" filter={`url(#${glowFilterId})`}>
        <rect x="-6" y="-1" width="59" height="59" rx="29.5" fill={`url(#${glowGradientId})`} />
      </g>
      <path
        className="agent-spark-avatar-main"
        d="M20.3083 9.81616L21.2304 12.4613C24.4794 21.7807 31.523 29.2883 40.6165 33.1244C31.523 36.9605 24.4794 44.4681 21.2304 53.7875L20.3083 56.4327L19.3861 53.7875C16.1371 44.4681 9.09349 36.9605 0 33.1244C9.09349 29.2883 16.1371 21.7807 19.3861 12.4613L20.3083 9.81616Z"
        fill={`url(#${fillMainId})`}
      />
      <path
        className="agent-spark-avatar-small"
        d="M39.2363 0L39.8705 1.71384C40.9914 4.74295 43.1797 7.25856 46.0244 8.7881C43.1797 10.3176 40.9914 12.8332 39.8705 15.8624L39.2363 17.5762L38.6022 15.8624C37.4813 12.8332 35.293 10.3176 32.4482 8.7881C35.293 7.25856 37.4813 4.74295 38.6022 1.71384L39.2363 0Z"
        fill={`url(#${fillSmallId})`}
      />
      <defs>
        <filter id={glowFilterId} x="-26" y="-21" width="99" height="99" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <radialGradient id={glowGradientId} cx="47.3%" cy="45.95%" r="35.46%">
          <stop stopColor="var(--agent-spark-glow-start, #4501FF)" stopOpacity="var(--agent-spark-glow-opacity, 0.78)" />
          <stop offset="1" stopColor="var(--agent-spark-glow-end, #7F15FA)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={fillMainId} x1="20.3083" y1="10.8162" x2="20.3083" y2="55.4327" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--agent-spark-main-start, #7E33D4)" />
          <stop offset="1" stopColor="var(--agent-spark-main-end, #5EA4FF)" />
        </linearGradient>
        <linearGradient id={fillSmallId} x1="39.2363" y1="0" x2="39.2363" y2="17.5762" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--agent-spark-small-start, var(--agent-spark-main-start, #7E33D4))" />
          <stop offset="1" stopColor="var(--agent-spark-small-end, var(--agent-spark-main-end, #5EA4FF))" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AgentWorkBotAvatar({ size = 48, ...rest }: { size?: number | string } & SVGProps<SVGSVGElement>) {
  const clipId = useId();
  const screenGradientId = useId();
  return (
    <svg
      {...rest}
      className={["agent-work-bot-avatar custom-avatar-face", rest.className].filter(Boolean).join(" ")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 74 74"
      fill="none"
      overflow="visible"
    >
      <circle cx="37" cy="37" r="37" fill="var(--agent-work-bot-bg, transparent)" />
      <g className="agent-work-bot-avatar-glyph" clipPath={`url(#${clipId})`}>
        <path
          d="M67.7639 25.7095C71.9667 27.1666 75 31.1238 75 35.7448V44.5739C75 49.1898 71.9656 53.1471 67.7639 54.6123C64.1248 64.1582 54.7343 71 43.8013 71H32.2069C21.274 71 11.8835 64.1551 8.24638 54.6123C4.03435 53.1481 1 49.1888 1 44.5749V35.7458C1 32.3382 2.65163 29.2884 5.20275 27.343L5.52216 14.4353C4.39497 13.9897 3.65518 12.9109 3.65106 11.7098V5.94269C3.65106 4.32554 4.99875 3.00816 6.63493 3C8.27832 3 9.626 4.32554 9.626 5.94269V11.7179C9.626 12.9466 8.84912 14.0091 7.7549 14.4435L8.03207 25.7921C8.1011 25.7625 8.17219 25.736 8.24328 25.7136C11.8835 16.1667 21.274 9.32179 32.2069 9.32179H43.8013C54.7425 9.32179 64.133 16.1636 67.7639 25.7105V25.7095ZM64.0634 43.7949V36.534C64.0634 30.5813 60.1157 25.7166 54.0666 25.7166H21.9416C15.8894 25.7166 11.9448 30.5813 11.9448 36.534V43.7949C11.9448 49.7445 15.8925 54.6123 21.9416 54.6123H54.0687C60.1209 54.6123 64.0655 49.7476 64.0655 43.7949H65.0624H64.0634Z"
          fill="var(--agent-work-bot-body, #28477D)"
          fillRule="evenodd"
          clipRule="evenodd"
        />
        <rect
          x="11"
          y="26"
          width="52"
          height="28"
          rx="9"
          fill="var(--agent-work-bot-face, #FFFFFF)"
          stroke={`url(#${screenGradientId})`}
          strokeWidth="2"
        />
        <g className="agent-work-bot-avatar-eyes" fill="var(--agent-work-bot-eye, var(--agent-work-bot-body, #28477D))">
          <rect x="21" y="33" width="8" height="14" rx="4" />
          <path d="M45 37C45 34.7909 46.7909 33 49 33C51.2091 33 53 34.7909 53 37V43C53 45.2091 51.2091 47 49 47C46.7909 47 45 45.2091 45 43V37Z" />
        </g>
      </g>
      <defs>
        <linearGradient id={screenGradientId} x1="62" y1="52.5" x2="14.5" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--agent-work-bot-screen-start, #2791FF)" />
          <stop offset="1" stopColor="var(--agent-work-bot-screen-end, #B000BD)" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="74" height="74" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

const UserFirstAvatarIcon = UserFirstAvatar as unknown as LucideIcon;
const AssistantSecondAvatarIcon = AssistantSecondAvatar as unknown as LucideIcon;
const UserThirdAvatarIcon = UserThirdAvatar as unknown as LucideIcon;
const UserFourthAvatarIcon = UserFourthAvatar as unknown as LucideIcon;
const MoodExcitedAvatarIcon = ((props) => <MoodAvatar {...props} variant="excited" />) as LucideIcon;
const MoodJoyfulAvatarIcon = ((props) => <MoodAvatar {...props} variant="joyful" />) as LucideIcon;
const MoodGratefulAvatarIcon = ((props) => <MoodAvatar {...props} variant="grateful" />) as LucideIcon;
const MoodEnergizedAvatarIcon = ((props) => <MoodAvatar {...props} variant="energized" />) as LucideIcon;
const MoodSensitiveAvatarIcon = ((props) => <MoodAvatar {...props} variant="sensitive" />) as LucideIcon;
const MoodConfusedAvatarIcon = ((props) => <MoodAvatar {...props} variant="confused" />) as LucideIcon;
const MoodBoredAvatarIcon = ((props) => <MoodAvatar {...props} variant="bored" />) as LucideIcon;
const MoodStressedAvatarIcon = ((props) => <MoodAvatar {...props} variant="stressed" />) as LucideIcon;
const MoodAngryAvatarIcon = ((props) => <MoodAvatar {...props} variant="angry" />) as LucideIcon;
const MoodInsecureAvatarIcon = ((props) => <MoodAvatar {...props} variant="insecure" />) as LucideIcon;
const MoodHurtAvatarIcon = ((props) => <MoodAvatar {...props} variant="hurt" />) as LucideIcon;
const MoodGuiltyAvatarIcon = ((props) => <MoodAvatar {...props} variant="guilty" />) as LucideIcon;
const UserBlueSmileAvatarIcon = UserBlueSmileAvatar as unknown as LucideIcon;
const UserGoldenJoyAvatarIcon = UserGoldenJoyAvatar as unknown as LucideIcon;
const UserGreenCalmAvatarIcon = UserGreenCalmAvatar as unknown as LucideIcon;
const UserPurpleBoredAvatarIcon = UserPurpleBoredAvatar as unknown as LucideIcon;
const UserHeartEyesAvatarIcon = UserHeartEyesAvatar as unknown as LucideIcon;
const AgentFirstAvatarIcon = AgentFirstAvatar as unknown as LucideIcon;
const AgentOrangeBlobAvatarIcon = AgentOrangeBlobAvatar as unknown as LucideIcon;
const AgentSparkAvatarIcon = AgentSparkAvatar as unknown as LucideIcon;
const AgentWorkBotAvatarIcon = AgentWorkBotAvatar as unknown as LucideIcon;
import { OrbFace } from "./OrbFace";
import { RobotFace } from "./RobotFace";

export type IconSlot =
  // session lifecycle
  | "session.initializing"
  | "session.running"
  | "session.idle"
  | "session.requires_action"
  | "session.rescheduling"
  | "session.terminated"
  | "session.deleted"
  // tool lifecycle
  | "tool.pending_approval"
  | "tool.in_progress"
  | "tool.file_read"
  | "tool.file_modified"
  | "tool.file_edit"
  | "tool.validate"
  | "tool.search"
  | "tool.completed"
  | "tool.failed"
  | "tool.cancelled"
  | "tool.partial"
  // permission
  | "permission.allow"
  | "permission.allow_always"
  | "permission.deny"
  | "permission.cancel"
  | "permission.pending"
  // runtime
  | "runtime.booting"
  | "runtime.ready"
  | "runtime.degraded"
  | "runtime.error"
  | "runtime.recovering"
  | "runtime.op"
  | "runtime.op_done"
  | "runtime.op_failed"
  | "runtime.op_skipped"
  // severity
  | "severity.info"
  | "severity.warning"
  | "severity.error"
  // authors + content
  | "author.user"
  | "author.agent"
  | "content.thinking"
  | "content.mcp"
  | "content.terminal"
  | "content.diff"
  | "content.image"
  | "content.audio"
  | "content.text"
  | "content.resource"
  | "content.location"
  | "source.native"
  | "source.mcp"
  // incidents
  | "incident.retrying"
  | "incident.exhausted"
  | "incident.terminal"
  // error domains
  | "error.model"
  | "error.mcp"
  | "error.billing"
  | "error.budget"
  | "error.resource"
  | "error.sandbox"
  | "error.timeout"
  | "error.unknown"
  // surfaces
  | "surface.activity"
  | "surface.diagnostics"
  | "surface.model_span"
  | "surface.compaction"
  | "surface.config"
  | "surface.interrupt";

export type IconOption = { id: string; label: string; Icon: LucideIcon; bold?: LucideIcon };

/** Ordered options per slot. The first entry is the default. 3-5 each. */
export const ICON_OPTIONS: Record<IconSlot, IconOption[]> = {
  "session.initializing": [
    { id: "loader", label: "Spinner", Icon: LoaderCircle },
    { id: "power", label: "Power", Icon: Power },
    { id: "hourglass", label: "Hourglass", Icon: Hourglass },
    { id: "circle-dashed", label: "Dashed", Icon: CircleDashed },
  ],
  "session.running": [
    { id: "loader", label: "Spinner", Icon: Loader },
    { id: "activity", label: "Pulse", Icon: Activity },
    { id: "zap", label: "Bolt", Icon: Zap },
    { id: "radio", label: "Live", Icon: Radio },
  ],
  "session.idle": [
    { id: "check", label: "Check", Icon: CircleCheck },
    { id: "pause", label: "Pause", Icon: Pause },
    { id: "clock", label: "Clock", Icon: Clock },
    { id: "dot", label: "Dot", Icon: CircleDot },
  ],
  "session.requires_action": [
    { id: "hand", label: "Hand", Icon: Hand },
    { id: "alert", label: "Alert", Icon: AlertTriangle },
    { id: "help", label: "Question", Icon: CircleHelp },
    { id: "clock", label: "Waiting", Icon: Clock3 },
  ],
  "session.rescheduling": [
    { id: "refresh", label: "Refresh", Icon: RefreshCw },
    { id: "timer-reset", label: "Timer", Icon: TimerReset },
    { id: "history", label: "History", Icon: History },
    { id: "rotate", label: "Rotate", Icon: RotateCcw },
  ],
  "session.terminated": [
    { id: "stop", label: "Stop", Icon: CircleStop },
    { id: "octagon", label: "Octagon", Icon: Octagon },
    { id: "ban", label: "Ban", Icon: Ban },
    { id: "power", label: "Power off", Icon: Power },
  ],
  "session.deleted": [
    { id: "x", label: "Cross", Icon: CircleX },
    { id: "skull", label: "Skull", Icon: Skull },
    { id: "ban", label: "Ban", Icon: Ban },
    { id: "slash", label: "Slash", Icon: CircleSlash },
  ],
  "tool.pending_approval": [
    { id: "clock", label: "Clock", Icon: Clock3 },
    { id: "shield-q", label: "Shield", Icon: ShieldQuestion },
    { id: "hand", label: "Hand", Icon: Hand },
    { id: "hourglass", label: "Hourglass", Icon: Hourglass },
  ],
  "tool.in_progress": [
    { id: "wrench", label: "Wrench", Icon: Wrench },
    { id: "hammer", label: "Hammer", Icon: Hammer },
    { id: "file-read-action", label: "Read file", Icon: FileReadAction },
    { id: "file-modified-action", label: "Modified file", Icon: FileModifiedAction },
  ],
  "tool.file_read": [
    { id: "file-read-action", label: "Read file", Icon: FileReadAction },
    { id: "file-text", label: "File", Icon: FileText },
    { id: "search-file", label: "Search file", Icon: FileText },
    { id: "info", label: "Info", Icon: Info },
  ],
  "tool.file_modified": [
    { id: "file-plus", label: "Modify file", Icon: FilePlus },
    { id: "file-modified-action", label: "Patch file", Icon: FileModifiedAction },
    { id: "diff", label: "Diff", Icon: FileDiff },
    { id: "hammer", label: "Patch", Icon: Hammer },
  ],
  "tool.file_edit": [
    { id: "file-pen", label: "Edit file", Icon: FilePen },
    { id: "pencil", label: "Pencil", Icon: Pencil },
    { id: "file-modified-action", label: "Marked file", Icon: FileModifiedAction },
    { id: "file-diff", label: "Diff", Icon: FileDiff },
  ],
  "tool.validate": [
    { id: "list-checks", label: "Validate", Icon: ListChecks },
    { id: "search-check", label: "Check search", Icon: SearchCheck },
    { id: "check", label: "Check", Icon: CircleCheck },
    { id: "bug", label: "Test", Icon: Bug },
  ],
  "tool.search": [
    { id: "file-search", label: "Search file", Icon: FileSearch },
    { id: "search", label: "Search", Icon: Search },
    { id: "waypoints", label: "References", Icon: Waypoints },
    { id: "layers", label: "Locations", Icon: Layers },
  ],
  "tool.completed": [
    { id: "check", label: "Check", Icon: CircleCheck },
    { id: "check-big", label: "Bold check", Icon: CircleCheckBig },
    { id: "badge", label: "Badge", Icon: BadgeCheck },
    { id: "shield", label: "Shield", Icon: ShieldCheck },
  ],
  "tool.failed": [
    { id: "alert", label: "Alert", Icon: AlertCircle },
    { id: "x", label: "Cross", Icon: CircleX },
    { id: "octagon", label: "Octagon", Icon: OctagonAlert },
    { id: "bug", label: "Bug", Icon: Bug },
  ],
  "tool.cancelled": [
    { id: "ban", label: "Ban", Icon: Ban },
    { id: "slash", label: "Slash", Icon: CircleSlash },
    { id: "x", label: "Cross", Icon: X },
    { id: "hand", label: "Hand", Icon: Hand },
  ],
  "tool.partial": [
    { id: "dot-dashed", label: "Dashed", Icon: CircleDotDashed },
    { id: "diff", label: "Diff", Icon: Diff },
    { id: "help", label: "Question", Icon: CircleHelp },
    { id: "dashed", label: "Outline", Icon: CircleDashed },
  ],
  "permission.allow": [
    { id: "check", label: "Check", Icon: CircleCheck },
    { id: "shield", label: "Shield", Icon: ShieldCheck },
    { id: "badge", label: "Badge", Icon: BadgeCheck },
    { id: "thumb", label: "Thumb", Icon: BadgeCheck },
  ],
  "permission.allow_always": [
    { id: "shield", label: "Shield", Icon: ShieldCheck },
    { id: "lock", label: "Lock", Icon: Lock },
    { id: "badge", label: "Badge", Icon: BadgeCheck },
    { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  ],
  "permission.deny": [
    { id: "shield-x", label: "Shield", Icon: ShieldX },
    { id: "thumbs-down", label: "Thumb", Icon: ThumbsDown },
    { id: "ban", label: "Ban", Icon: Ban },
    { id: "x", label: "Cross", Icon: CircleX },
  ],
  "permission.cancel": [
    { id: "x", label: "Cross", Icon: X },
    { id: "ban", label: "Ban", Icon: Ban },
    { id: "slash", label: "Slash", Icon: CircleSlash },
    { id: "hand", label: "Hand", Icon: Hand },
  ],
  "permission.pending": [
    { id: "shield-q", label: "Shield", Icon: ShieldQuestion },
    { id: "clock", label: "Clock", Icon: Clock3 },
    { id: "help", label: "Question", Icon: CircleHelp },
    { id: "shield-alert", label: "Alert", Icon: ShieldAlert },
  ],
  "runtime.booting": [
    { id: "power", label: "Power", Icon: Power },
    { id: "server-cog", label: "Server", Icon: ServerCog },
    { id: "loader", label: "Spinner", Icon: LoaderCircle },
    { id: "cpu", label: "CPU", Icon: Cpu },
  ],
  "runtime.ready": [
    { id: "check", label: "Check", Icon: CircleCheck },
    { id: "server", label: "Server", Icon: Server },
    { id: "power", label: "Power", Icon: Power },
    { id: "zap", label: "Bolt", Icon: Zap },
  ],
  "runtime.degraded": [
    { id: "alert", label: "Alert", Icon: TriangleAlert },
    { id: "gauge", label: "Gauge", Icon: Gauge },
    { id: "cone", label: "Cone", Icon: TrafficCone },
    { id: "wifi-off", label: "Weak", Icon: WifiOff },
  ],
  "runtime.error": [
    { id: "crash", label: "Crash", Icon: ServerCrash },
    { id: "octagon", label: "Octagon", Icon: OctagonAlert },
    { id: "alert", label: "Alert", Icon: AlertOctagon },
    { id: "bug", label: "Bug", Icon: Bug },
  ],
  "runtime.recovering": [
    { id: "refresh", label: "Refresh", Icon: RefreshCw },
    { id: "rotate", label: "Rotate", Icon: RotateCcw },
    { id: "history", label: "History", Icon: History },
    { id: "power", label: "Power", Icon: Power },
  ],
  "runtime.op": [
    { id: "loader", label: "Spinner", Icon: Loader },
    { id: "waypoints", label: "Waypoints", Icon: Waypoints },
    { id: "package", label: "Package", Icon: Package },
    { id: "hard-drive", label: "Disk", Icon: HardDrive },
  ],
  "runtime.op_done": [
    { id: "check", label: "Check", Icon: CircleCheck },
    { id: "badge", label: "Badge", Icon: BadgeCheck },
    { id: "list", label: "List", Icon: ListChecks },
    { id: "dot", label: "Dot", Icon: CircleDot },
  ],
  "runtime.op_failed": [
    { id: "x", label: "Cross", Icon: CircleX },
    { id: "alert", label: "Alert", Icon: AlertCircle },
    { id: "octagon", label: "Octagon", Icon: OctagonAlert },
    { id: "bug", label: "Bug", Icon: Bug },
  ],
  "runtime.op_skipped": [
    { id: "skip", label: "Skip", Icon: SkipForward },
    { id: "slash", label: "Slash", Icon: CircleSlash },
    { id: "dashed", label: "Dashed", Icon: CircleDashed },
    { id: "ban", label: "Ban", Icon: Ban },
  ],
  "severity.info": [
    { id: "info", label: "Info", Icon: Info },
    { id: "message", label: "Message", Icon: MessageCircle },
    { id: "dot", label: "Dot", Icon: CircleDot },
    { id: "bulb", label: "Bulb", Icon: Lightbulb },
  ],
  "severity.warning": [
    { id: "triangle", label: "Triangle", Icon: TriangleAlert },
    { id: "alert", label: "Alert", Icon: AlertTriangle },
    { id: "cone", label: "Cone", Icon: TrafficCone },
    { id: "gauge", label: "Gauge", Icon: Gauge },
  ],
  "severity.error": [
    { id: "octagon", label: "Octagon", Icon: OctagonAlert },
    { id: "alert", label: "Alert", Icon: AlertOctagon },
    { id: "x", label: "Cross", Icon: CircleX },
    { id: "bug", label: "Bug", Icon: Bug },
  ],
  "author.user": [
    { id: "user", label: "User", Icon: UserFirstAvatarIcon },
    { id: "assistant-second-avatar", label: "Avatar", Icon: AssistantSecondAvatarIcon },
    { id: "user-third-avatar", label: "Avatar", Icon: UserThirdAvatarIcon },
    { id: "user-fourth-avatar", label: "Avatar", Icon: UserFourthAvatarIcon },
    { id: "mood-excited", label: "Excited", Icon: MoodExcitedAvatarIcon },
    { id: "mood-joyful", label: "Joyful", Icon: MoodJoyfulAvatarIcon },
    { id: "mood-grateful", label: "Grateful", Icon: MoodGratefulAvatarIcon },
    { id: "mood-energized", label: "Energized", Icon: MoodEnergizedAvatarIcon },
    { id: "mood-sensitive", label: "Sensitive", Icon: MoodSensitiveAvatarIcon },
    { id: "mood-confused", label: "Confused", Icon: MoodConfusedAvatarIcon },
    { id: "mood-bored", label: "Bored", Icon: MoodBoredAvatarIcon },
    { id: "mood-stressed", label: "Stressed", Icon: MoodStressedAvatarIcon },
    { id: "mood-angry", label: "Angry", Icon: MoodAngryAvatarIcon },
    { id: "mood-insecure", label: "Insecure", Icon: MoodInsecureAvatarIcon },
    { id: "mood-hurt", label: "Hurt", Icon: MoodHurtAvatarIcon },
    { id: "mood-guilty", label: "Guilty", Icon: MoodGuiltyAvatarIcon },
    { id: "blue-smile", label: "Blue smile", Icon: UserBlueSmileAvatarIcon },
    { id: "heart-eyes", label: "Heart eyes", Icon: UserHeartEyesAvatarIcon },
    { id: "golden-joy", label: "Golden joy", Icon: UserGoldenJoyAvatarIcon },
    { id: "green-calm", label: "Green calm", Icon: UserGreenCalmAvatarIcon },
    { id: "purple-bored", label: "Purple bored", Icon: UserPurpleBoredAvatarIcon },
  ],
  "author.agent": [
    { id: "orange-blob", label: "Orange blob", Icon: AgentOrangeBlobAvatarIcon },
    { id: "bot", label: "Bot", Icon: AgentFirstAvatarIcon },
    { id: "orb", label: "Orb", Icon: OrbFace as unknown as LucideIcon },
    { id: "robot", label: "Robot", Icon: RobotFace as unknown as LucideIcon },
    { id: "spark-avatar", label: "Spark", Icon: AgentSparkAvatarIcon },
    { id: "work-bot", label: "Working Bot", Icon: AgentWorkBotAvatarIcon },
  ],
  "content.thinking": [
    { id: "bulb", label: "Bulb", Icon: Lightbulb },
    { id: "sparkles", label: "Sparkles", Icon: Sparkles },
    { id: "loader", label: "Spinner", Icon: Loader },
    { id: "activity", label: "Pulse", Icon: Activity },
  ],
  "content.mcp": [
    { id: "plug", label: "Plug", Icon: Plug },
    { id: "boxes", label: "Boxes", Icon: Boxes },
    { id: "server", label: "Server", Icon: Server },
    { id: "layers", label: "Layers", Icon: Layers },
  ],
  "content.terminal": [
    { id: "terminal", label: "Terminal", Icon: Terminal },
    { id: "square-terminal", label: "Square", Icon: SquareTerminal },
    { id: "cpu", label: "CPU", Icon: Cpu },
    { id: "server", label: "Server", Icon: Server },
  ],
  "content.diff": [
    { id: "file-diff", label: "File diff", Icon: FileDiff },
    { id: "diff", label: "Diff", Icon: Diff },
    { id: "file", label: "File", Icon: FileText },
    { id: "layers", label: "Layers", Icon: Layers },
  ],
  "content.image": [
    { id: "image", label: "Image", Icon: ImageIcon },
    { id: "file", label: "File", Icon: FileText },
    { id: "layers", label: "Layers", Icon: Layers },
    { id: "package", label: "Package", Icon: Package },
  ],
  "content.audio": [
    { id: "music", label: "Music", Icon: Music },
    { id: "radio", label: "Radio", Icon: Radio },
    { id: "rss", label: "Rss", Icon: Rss },
    { id: "file", label: "File", Icon: FileText },
  ],
  "content.text": [
    { id: "file", label: "File", Icon: FileText },
    { id: "message", label: "Message", Icon: MessageCircle },
    { id: "info", label: "Info", Icon: Info },
    { id: "layers", label: "Layers", Icon: Layers },
  ],
  "content.resource": [
    { id: "package", label: "Package", Icon: Package },
    { id: "file", label: "File", Icon: FileText },
    { id: "layers", label: "Layers", Icon: Layers },
    { id: "disk", label: "Disk", Icon: HardDrive },
  ],
  "content.location": [
    { id: "waypoints", label: "Waypoints", Icon: Waypoints },
    { id: "file", label: "File", Icon: FileText },
    { id: "layers", label: "Layers", Icon: Layers },
    { id: "info", label: "Info", Icon: Info },
  ],
  "source.native": [
    { id: "wrench", label: "Wrench", Icon: Wrench },
    { id: "hammer", label: "Hammer", Icon: Hammer },
    { id: "cpu", label: "CPU", Icon: Cpu },
    { id: "terminal", label: "Terminal", Icon: Terminal },
  ],
  "source.mcp": [
    { id: "plug", label: "Plug", Icon: Plug },
    { id: "boxes", label: "Boxes", Icon: Boxes },
    { id: "server", label: "Server", Icon: Server },
    { id: "layers", label: "Layers", Icon: Layers },
  ],
  "incident.retrying": [
    { id: "refresh", label: "Refresh", Icon: RefreshCw },
    { id: "timer", label: "Timer", Icon: Timer },
    { id: "hourglass", label: "Hourglass", Icon: Hourglass },
    { id: "rotate", label: "Rotate", Icon: RotateCcw },
  ],
  "incident.exhausted": [
    { id: "alert", label: "Alert", Icon: AlertTriangle },
    { id: "gauge", label: "Gauge", Icon: Gauge },
    { id: "octagon", label: "Octagon", Icon: OctagonAlert },
    { id: "ban", label: "Ban", Icon: Ban },
  ],
  "incident.terminal": [
    { id: "octagon", label: "Octagon", Icon: Octagon },
    { id: "stop", label: "Stop", Icon: CircleStop },
    { id: "skull", label: "Skull", Icon: Skull },
    { id: "shield-x", label: "Shield", Icon: ShieldX },
  ],
  "error.model": [
    { id: "cpu", label: "CPU", Icon: Cpu },
    { id: "bot", label: "Bot", Icon: Bot },
    { id: "zap", label: "Bolt", Icon: Zap },
    { id: "gauge", label: "Gauge", Icon: Gauge },
  ],
  "error.mcp": [
    { id: "plug", label: "Plug", Icon: Plug },
    { id: "wifi-off", label: "Offline", Icon: WifiOff },
    { id: "server", label: "Server", Icon: Server },
    { id: "shield-alert", label: "Auth", Icon: ShieldAlert },
  ],
  "error.billing": [
    { id: "card", label: "Card", Icon: CreditCard },
    { id: "dollar", label: "Dollar", Icon: DollarSign },
    { id: "alert", label: "Alert", Icon: AlertCircle },
    { id: "shield", label: "Shield", Icon: Shield },
  ],
  "error.budget": [
    { id: "gauge", label: "Gauge", Icon: Gauge },
    { id: "dollar", label: "Dollar", Icon: DollarSign },
    { id: "timer", label: "Timer", Icon: Timer },
    { id: "alert", label: "Alert", Icon: AlertTriangle },
  ],
  "error.resource": [
    { id: "hard-drive", label: "Disk", Icon: HardDrive },
    { id: "package", label: "Package", Icon: Package },
    { id: "layers", label: "Layers", Icon: Layers },
    { id: "server", label: "Server", Icon: Server },
  ],
  "error.sandbox": [
    { id: "crash", label: "Crash", Icon: ServerCrash },
    { id: "cpu", label: "CPU", Icon: Cpu },
    { id: "octagon", label: "Octagon", Icon: OctagonAlert },
    { id: "bug", label: "Bug", Icon: Bug },
  ],
  "error.timeout": [
    { id: "timer", label: "Timer", Icon: Timer },
    { id: "clock", label: "Clock", Icon: Clock },
    { id: "hourglass", label: "Hourglass", Icon: Hourglass },
    { id: "alert", label: "Alert", Icon: AlertTriangle },
  ],
  "error.unknown": [
    { id: "help", label: "Question", Icon: CircleHelp },
    { id: "alert", label: "Alert", Icon: AlertCircle },
    { id: "bug", label: "Bug", Icon: Bug },
    { id: "octagon", label: "Octagon", Icon: OctagonAlert },
  ],
  "surface.activity": [
    { id: "activity", label: "Activity", Icon: Activity },
    { id: "history", label: "History", Icon: History },
    { id: "list", label: "List", Icon: ListChecks },
    { id: "radio", label: "Live", Icon: Radio },
  ],
  "surface.diagnostics": [
    { id: "bug", label: "Bug", Icon: Bug },
    { id: "gauge", label: "Gauge", Icon: Gauge },
    { id: "terminal", label: "Terminal", Icon: Terminal },
    { id: "cpu", label: "CPU", Icon: Cpu },
  ],
  "surface.model_span": [
    { id: "cpu", label: "CPU", Icon: Cpu },
    { id: "gauge", label: "Gauge", Icon: Gauge },
    { id: "zap", label: "Bolt", Icon: Zap },
    { id: "activity", label: "Pulse", Icon: Activity },
  ],
  "surface.compaction": [
    { id: "layers", label: "Layers", Icon: Layers },
    { id: "package", label: "Package", Icon: Package },
    { id: "history", label: "History", Icon: History },
    { id: "diff", label: "Diff", Icon: Diff },
  ],
  "surface.config": [
    { id: "cog", label: "Cog", Icon: ServerCog },
    { id: "shield", label: "Shield", Icon: Shield },
    { id: "list", label: "List", Icon: ListChecks },
    { id: "layers", label: "Layers", Icon: Layers },
  ],
  "surface.interrupt": [
    { id: "hand", label: "Hand", Icon: Hand },
    { id: "stop", label: "Stop", Icon: CircleStop },
    { id: "ban", label: "Ban", Icon: Ban },
    { id: "x", label: "Cross", Icon: X },
  ],
};

export type IconSet = Partial<Record<IconSlot, string>>;

const ALL_SLOTS = Object.keys(ICON_OPTIONS) as IconSlot[];
const NATIVE_USER_AVATAR_FALLBACK_IDS = new Set(["user", "assistant-second-avatar", "user-third-avatar", "green-calm"]);

export function defaultIconSet(): IconSet {
  const set: IconSet = {};
  for (const slot of ALL_SLOTS) set[slot] = ICON_OPTIONS[slot][0]?.id;
  return set;
}

/** Whole-set presets: each maps to the Nth option where available. */
export type IconPresetId = "classic" | "geometric" | "expressive";

export const ICON_PRESETS: { id: IconPresetId; name: string; index: number }[] = [
  { id: "classic", name: "Classic", index: 0 },
  { id: "geometric", name: "Geometric", index: 1 },
  { id: "expressive", name: "Expressive", index: 2 },
];

export function iconSetFromPreset(preset: IconPresetId): IconSet {
  const cfg = ICON_PRESETS.find((p) => p.id === preset) ?? ICON_PRESETS[0];
  const set: IconSet = {};
  for (const slot of ALL_SLOTS) {
    const options = ICON_OPTIONS[slot];
    set[slot] = (options[cfg.index] ?? options[0])?.id;
  }
  return set;
}

export function resolveIcon(set: IconSet, slot: IconSlot, style: IconStyle = "line"): LucideIcon {
  const options = ICON_OPTIONS[slot];
  let chosen = set[slot];
  if (style === "bold" && slot === "author.user" && (!chosen || NATIVE_USER_AVATAR_FALLBACK_IDS.has(chosen))) {
    chosen = "blue-smile";
  }
  const option = options.find((o) => o.id === chosen) ?? options[0];
  if (style === "bold" && option.bold) {
    return option.bold;
  }
  return option.Icon;
}

// --- state -> slot mappers --------------------------------------------------

export function sessionLifecycleSlot(lifecycle: string): IconSlot {
  const map: Record<string, IconSlot> = {
    initializing: "session.initializing",
    running: "session.running",
    idle: "session.idle",
    requires_action: "session.requires_action",
    rescheduling: "session.rescheduling",
    terminated: "session.terminated",
    deleted: "session.deleted",
  };
  return map[lifecycle] ?? "session.idle";
}

export function toolLifecycleSlot(lifecycle: string): IconSlot {
  const map: Record<string, IconSlot> = {
    pending_approval: "tool.pending_approval",
    in_progress: "tool.in_progress",
    completed: "tool.completed",
    failed: "tool.failed",
    cancelled: "tool.cancelled",
    partial: "tool.partial",
  };
  return map[lifecycle] ?? "tool.in_progress";
}

export function severitySlot(severity: string): IconSlot {
  if (severity === "error") return "severity.error";
  if (severity === "warning") return "severity.warning";
  return "severity.info";
}

export function incidentSlot(recovery: string): IconSlot {
  if (recovery === "terminal") return "incident.terminal";
  if (recovery === "exhausted") return "incident.exhausted";
  return "incident.retrying";
}

export function runtimeStateSlot(state: string): IconSlot {
  const map: Record<string, IconSlot> = {
    booting: "runtime.booting",
    ready: "runtime.ready",
    degraded: "runtime.degraded",
    error: "runtime.error",
    recovering: "runtime.recovering",
  };
  return map[state] ?? "runtime.booting";
}

export function runtimeOpSlot(status: string): IconSlot {
  if (status === "completed") return "runtime.op_done";
  if (status === "failed") return "runtime.op_failed";
  if (status === "skipped") return "runtime.op_skipped";
  return "runtime.op";
}

export function errorDomainSlot(type: string): IconSlot {
  if (type.startsWith("model_")) return "error.model";
  if (type.startsWith("mcp_")) return "error.mcp";
  if (type === "billing_error") return "error.billing";
  if (type === "budget_exceeded_error") return "error.budget";
  if (type === "resource_quota_exceeded_error") return "error.resource";
  if (type === "sandbox_failed_error") return "error.sandbox";
  if (type === "dispatch_execution_timeout") return "error.timeout";
  if (type === "runtime_resume_unrecoverable_error") return "error.sandbox";
  return "error.unknown";
}
