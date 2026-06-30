"use client"

import { Box, Button, Icon, Text } from "ui"

export default function DemoPage() {
  return (
    <div
      style={{
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 32,
        maxWidth: 420,
      }}
    >
      <Text style="14-600">Send amount</Text>
      <Box vertical elevation="high" align="start">
        <Text style="12-400" color="text-secondary">
          You send
        </Text>
        <Box padding="none">
          <input
            style={{ all: "unset", flex: 1, fontSize: 24, fontWeight: 600 }}
            placeholder="0.00"
          />
          <Button variant="pill" text="USDC" icon="BsWallet2" color="main" />
        </Box>
      </Box>

      <Text style="14-600">Recipient</Text>
      <Box align="start" vertical elevation="high">
        <Text style="12-400" color="text-secondary">
          To
        </Text>
        <Box padding="none">
          <input
            style={{ all: "unset", flex: 1, fontSize: 14 }}
            placeholder="Address or ENS"
          />
          <Button variant="icon" icon="BsQrCodeScan" color="dim" />
        </Box>
      </Box>

      <Text style="14-600">Token row (selected)</Text>
      <Box elevation="high" selected onClick={() => {}}>
        <Icon name="BsWallet2" size="big" />
        <div style={{ flex: 1, paddingInline: 12 }}>
          <Text style="14-600">USDC</Text>
          <Text style="12-400" color="text-secondary">
            {" "}
            · Ethereum
          </Text>
        </div>
        <Text style="14-600">$120.00</Text>
      </Box>

      <Text style="14-600">Token row (disabled)</Text>
      <Box elevation="high" disabled onClick={() => {}}>
        <Icon name="BsWallet2" size="big" />
        <div style={{ flex: 1, paddingInline: 12 }}>
          <Text style="14-600">ETH</Text>
          <Text style="12-400" color="text-secondary">
            {" "}
            · Ethereum
          </Text>
        </div>
        <Text style="14-600">$0.00</Text>
      </Box>

      <Text style="14-600">Invite code</Text>
      <Box vertical elevation="high" align="start">
        <Text style="12-400" color="text-secondary">
          Your invite code
        </Text>
        <Box padding="none" width="content">
          <Text style="16-600">GW-A1B2C3</Text>
          <Button variant="square" icon="BsCopy" copyValue="GW-A1B2C3" />
        </Box>
      </Box>
    </div>
  )
}
