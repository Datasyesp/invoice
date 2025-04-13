'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Reports() {
  return (
    <div className="p-6 flex justify-center items-center min-h-[70vh]">
      <Card className="text-center max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Reports</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600 text-lg">
          🚧 This feature is coming soon. Stay tuned!
        </CardContent>
      </Card>
    </div>
  )
}
