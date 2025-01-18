"use client";

import { TokenList } from "@/components/token/TokenList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TriggerConfigDrawer } from "@/components/triggers/TriggerConfigDrawer";

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Token Monitor</h1>
        <TriggerConfigDrawer />
      </div>

      <Tabs defaultValue="tokens" className="w-full">
        <TabsList>
          <TabsTrigger value="tokens">Token Monitor</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens">
          <TokenList />
        </TabsContent>

        <TabsContent value="database">
          {/* Temporarily disabled DatabaseViewer while fixing database issues */}
          {/* <DatabaseViewer /> */}
        </TabsContent>
      </Tabs>
    </main>
  );
}
