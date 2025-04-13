'use client'

import * as React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HelpCircle } from 'lucide-react'

export function Subscription() {
  const [locked, setLocked] = React.useState(true); // Track whether the page is locked or not

  return (
    <div className="relative container mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold text-black">Subscription</h1>
          <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-600">Beta</Badge>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-100 text-black">
          <TabsTrigger value="overview" className="data-[state=active]:bg-black data-[state=active]:text-white">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-white text-black border-gray-200">
            <CardHeader>
              <CardTitle className="text-black flex items-center space-x-2">
                <span>beta version</span>
              </CardTitle>
             
              <div className="mt-2 text-sm text-yellow-600">
                This is a <strong>beta version</strong> — features may change as we improve your experience.
              </div>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <footer className="flex justify-between items-center pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-600">© 2025 Yesp. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Subscription />
    </div>
  )
}
