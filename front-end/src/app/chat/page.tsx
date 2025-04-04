"use client"

import type React from "react"

import { useState } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Menu, Phone, MoreVertical, Smile, Send } from "lucide-react"

export default function ChatPage() {
  const [message, setMessage] = useState("")

  const conversations = [
    {
      id: 1,
      name: "Chatgram",
      lastMessage: "Chatgram Web was updated.",
      time: "19:48",
      isGroup: true,
      unread: 1,
      avatar: "/placeholder.svg?height=40&width=40",
      verified: true,
    },
    {
      id: 2,
      name: "Jessica Drew",
      lastMessage: "Ok, see you later",
      time: "18:30",
      unread: 2,
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 3,
      name: "David Moore",
      lastMessage: "You: I don't remember anything 😄",
      time: "18:16",
      avatar: "/placeholder.svg?height=40&width=40",
      active: true,
    },
    {
      id: 4,
      name: "Greg James",
      lastMessage: "I got a job at SpaceX 🚀",
      time: "18:02",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 5,
      name: "Emily Dorson",
      lastMessage: "Table for four, 5PM. Be there.",
      time: "17:42",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 6,
      name: "Office Chat",
      lastMessage: "Lewis: All done mate 👍",
      time: "17:08",
      isGroup: true,
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 7,
      name: "Announcements",
      lastMessage: "Channel created",
      time: "16:15",
      isGroup: true,
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 8,
      name: "Little Sister",
      lastMessage: "Tell mom I will be home for tea ❤️",
      time: "Wed",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 9,
      name: "Art Class",
      lastMessage: "Emily: 🖼️ Editorial",
      time: "Tue",
      isGroup: true,
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  const messages = [
    {
      id: 1,
      content: "OMG 😮 do you remember what you did last night at the work night out?",
      time: "18:12",
      isUser: false,
      liked: true,
    },
    {
      id: 2,
      content: "no haha",
      time: "18:15",
      isUser: true,
    },
    {
      id: 3,
      content: "I don't remember anything 😅",
      time: "18:16",
      isUser: true,
    },
  ]

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      // Here you would typically send the message to your backend
      console.log("Sending message:", message)
      setMessage("")
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Sidebar Header */}
        <div className="p-3 flex items-center justify-between border-b">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative w-full max-w-xs mx-2">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-8 h-9 bg-gray-100 border-none" />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center p-3 hover:bg-gray-100 cursor-pointer ${chat.active ? "bg-gray-100" : ""}`}
            >
              <Avatar className="h-10 w-10">
                <img src={chat.avatar || "/placeholder.svg"} alt={chat.name} />
              </Avatar>
              <div className="ml-3 flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="font-medium text-sm">{chat.name}</span>
                    {chat.verified && (
                      <span className="ml-1 text-blue-500">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                  {chat.unread && (
                    <Badge className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-green-500">
                      <span className="text-xs">{chat.unread}</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-9 w-9">
              <img src="/placeholder.svg?height=36&width=36" alt="David Moore" />
            </Avatar>
            <div className="ml-3">
              <h2 className="font-medium">David Moore</h2>
              <p className="text-xs text-gray-500">last seen 5 mins ago</p>
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 bg-blue-50 overflow-y-auto" style={{ backgroundImage: "url('/chat-bg.svg')" }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <Badge variant="outline" className="bg-blue-500 text-white border-none px-3 py-1">
                Today
              </Badge>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex mb-4 ${msg.isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    msg.isUser ? "bg-green-500 text-white rounded-br-none" : "bg-white text-black rounded-bl-none"
                  }`}
                >
                  <p>{msg.content}</p>
                  <div
                    className={`flex items-center justify-end mt-1 text-xs ${msg.isUser ? "text-green-100" : "text-gray-500"}`}
                  >
                    <span>{msg.time}</span>
                    {msg.liked && <span className="ml-1">❤️</span>}
                    {msg.isUser && <span className="ml-1">✓</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t flex items-center">
          <Button type="button" variant="ghost" size="icon">
            <Smile className="h-5 w-5" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            className="mx-2 bg-white"
          />
          <Button type="submit" size="icon" className="text-blue-500" variant="ghost">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}

