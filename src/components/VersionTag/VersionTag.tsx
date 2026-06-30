import { Text } from "ui"

import packageJson from "../../../package.json"
import styles from "./VersionTag.module.css"

export default function VersionTag() {
  return (
    <div className={styles.versionTagContainer}>
      <Text style="12-400" color="text-tertiary">
        Version {packageJson.version}
      </Text>
    </div>
  )
}
