"use client"

import { useState, useRef } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight, Camera, Edit, Save, X, User } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export default function ProfileModal() {
  const [isEditing, setIsEditing] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [date, setDate] = useState<Date | undefined>(new Date(1990, 0, 1))
  const [isOpen, setIsOpen] = useState(false)

  // User profile data
  // Add individual edit states
  const [editingField, setEditingField] = useState<string | null>(null);

  // Modify initial profile state (remove location)
  const [profile, setProfile] = useState({
    name: "David Moore",
    username: "@davidmoore",
    bio: "Software engineer passionate about web development and UI/UX design. Love to travel and explore new places.",
    dob: new Date(1990, 0, 1),
    phone: "+1 (555) 123-4567",
    gender: "Male",
    email: "david.moore@example.com",
    location: "San Francisco, CA",
  })

  const sections = [
    { id: "bio", label: "Bio" },
    { id: "dob", label: "Date of Birth" },
    { id: "phone", label: "Phone Number" },
    { id: "gender", label: "Gender" },
  ]

  const scrollToSection = (index: number) => {
    setActiveSection(index)
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const sectionElement = container.children[index] as HTMLElement
      if (sectionElement) {
        container.scrollTo({
          left: sectionElement.offsetLeft - container.offsetLeft,
          behavior: "smooth",
        })
      }
    }
  }

  const handleNext = () => {
    const nextSection = Math.min(activeSection + 1, sections.length - 1)
    scrollToSection(nextSection)
  }

  const handlePrev = () => {
    const prevSection = Math.max(activeSection - 1, 0)
    scrollToSection(prevSection)
  }

  const handleSave = () => {
    // Here you would typically save the profile data to your backend
    setIsEditing(false)
    // Show success message or handle response
    console.log("Profile updated:", profile)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset editing state when closing the modal
      setIsEditing(false)
      setActiveSection(0)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <User className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-0">
          {/* Cover Image */}
          <div className="relative h-40 bg-gradient-to-r from-blue-400 to-blue-600">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/placeholder.svg?height=400&width=1200')" }}
            />
            <div className="absolute top-2 right-2 flex space-x-2">
              <Button variant="secondary" size="sm" className="rounded-full">
                <Camera className="h-4 w-4 mr-2" />
                Change Cover
              </Button>
              <DialogClose asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <div className="flex flex-col md:flex-row">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center md:items-start md:mr-8 -mt-12 md:-mt-16">
              <div className="relative">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white">
                  <img src="/placeholder.svg?height=128&width=128" alt="Profile" />
                </Avatar>
                <Button variant="secondary" size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <h1 className="mt-4 text-xl md:text-2xl font-bold">{profile.name}</h1>
              <p className="text-gray-500">{profile.username}</p>

              <div className="mt-4 space-y-2 text-sm w-full">
                <div className="flex items-center">
                  <span className="text-gray-500 w-24">Email:</span>
                  {editingField === 'email' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="h-8"
                      />
                      <Button size="sm" onClick={handleFieldSave}>Save</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{profile.email}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleFieldEdit('email')}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Button className="mt-6 w-full md:w-auto" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>

            {/* Profile Details */}
            <div className="flex-1 mt-6 md:mt-0">
              {!isEditing ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-medium">Bio</h2>
                    <p className="mt-1 text-gray-600">{profile.bio}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h2 className="text-lg font-medium">Date of Birth</h2>
                      <p className="mt-1 text-gray-600">{format(profile.dob, "PPP")}</p>
                    </div>

                    <div>
                      <h2 className="text-lg font-medium">Phone Number</h2>
                      <p className="mt-1 text-gray-600">{profile.phone}</p>
                    </div>

                    <div>
                      <h2 className="text-lg font-medium">Gender</h2>
                      <p className="mt-1 text-gray-600">{profile.gender}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium">Edit Profile</h2>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="icon" onClick={handlePrev} disabled={activeSection === 0}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNext}
                        disabled={activeSection === sections.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                    {sections.map((section, index) => (
                      <Button
                        key={section.id}
                        variant={activeSection === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => scrollToSection(index)}
                        className="rounded-full flex-shrink-0"
                      >
                        {section.label}
                      </Button>
                    ))}
                  </div>

                  <ScrollArea ref={scrollContainerRef} className="w-full">
                    <div className="flex space-x-4 pb-4" style={{ width: `${sections.length * 100}%` }}>
                      {/* Bio Section */}
                      <div className="w-full flex-shrink-0">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                              id="bio"
                              value={profile.bio}
                              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                              rows={4}
                              placeholder="Tell us about yourself"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Date of Birth Section */}
                      <div className="w-full flex-shrink-0">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id="dob"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={date}
                                  onSelect={(newDate) => {
                                    setDate(newDate)
                                    if (newDate) {
                                      setProfile({ ...profile, dob: newDate })
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      {/* Phone Number Section */}
                      <div className="w-full flex-shrink-0">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              value={profile.phone}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                              placeholder="Enter your phone number"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Gender Section */}
                      <div className="w-full flex-shrink-0">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="gender">Gender</Label>
                            <Select
                              value={profile.gender}
                              onValueChange={(value) => setProfile({ ...profile, gender: value })}
                            >
                              <SelectTrigger id="gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Non-binary">Non-binary</SelectItem>
                                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>

                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

