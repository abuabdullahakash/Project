import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, BookOpen, Plus, Search, Filter, Calendar, Image as ImageIcon, 
  Clock, Settings, Trash2, Edit, ExternalLink, FileText, Check, ChevronLeft, ChevronRight,
  Brain, Timer, Sparkles, Mail, Layers, Activity, ChevronDown, CheckCircle, 
  X, Play, Pause, RotateCcw, Flame, Trophy, AlertTriangle, HelpCircle, 
  ArrowRight, Globe, Info, Upload, Copy, Eye, ZoomIn, ZoomOut, Maximize2, Download
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import { uploadImageToImgBB } from '../../lib/imgbb';

// Firebase Operation types for error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Database Error during ${operationType}: Please check console.`);
  throw new Error(JSON.stringify(errInfo));
}

// Interfaces
interface Course {
  id: string;
  userId: string;
  name: string;
  year: string;
  code?: string;
  credit?: string;
  imageUrl?: string;
  chapters?: string[];
  additionalLinks?: { title: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

interface EducationalNote {
  id: string;
  courseId: string;
  userId: string;
  chatTitle: string;
  categories: string[]; // "Suggestions" | "Notes" | "Syllabus"
  chapter: string;
  question: string;
  questionCount?: number;
  gmail: string;
  aiProvider: string; // "ChatGPT" | "Gemini" | "Google AI Studio" | "Claude" | "Qwen"
  chatLink?: string;
  additionalLinks?: { title: string; url: string }[];
  questionImages?: string[];
  questionImageUrl?: string;
  solutionImages?: string[];
  createdAt: string;
  updatedAt: string;
}

const AI_PROVIDERS = ['ChatGPT', 'Gemini', 'Google AI Studio', 'Claude', 'Qwen'];
const CATEGORY_OPTIONS = ['Suggestions', 'Notes', 'Syllabus'];

const PRESET_COVERS = [
  { id: 'math', name: 'Mathematics', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800' },
  { id: 'cs', name: 'Computer Science', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800' },
  { id: 'science', name: 'Sciences', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800' },
  { id: 'literature', name: 'Literature & Languages', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800' },
  { id: 'history', name: 'History & Culture', url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=800' },
  { id: 'business', name: 'Business & Finance', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800' },
];

const MOTIVATIONAL_QUOTES = [
  { text: "শেখার সবচেয়ে বড় সুবিধা হলো, কেউ তা তোমার থেকে কেড়ে নিতে পারবে না।", author: "বি.বি. কিং" },
  { text: "এমনভাবে বাঁচো যেন তুমি আগামীকাল মারা যাবে। এমনভাবে শেখো যেন তুমি চিরকাল বেঁচে থাকবে।", author: "মহাত্মা গান্ধী" },
  { text: "শিক্ষা কোনো পাত্র পূরণ করা নয়, বরং এটি একটি শিখা প্রজ্বলিত করা।", author: "ডব্লিউ.বি. ইয়েটস" },
  { text: "মন কোনো খালি পাত্র নয় যা পূর্ণ করতে হবে, বরং এটি একটি জ্বলন্ত অগ্নিকুণ্ড যাকে প্রজ্বলিত করতে হবে।", author: "প্লুটার্ক" },
  { text: "জ্ঞানে বিনিয়োগ সবচেয়ে ভালো সুদ বা রিটার্ন দেয়।", author: "বেঞ্জামিন ফ্রাঙ্কলিন" },
  { text: "সাফল্য হলো প্রতিদিনের ছোট ছোট প্রচেষ্টার সমষ্টির ফল।", author: "রবার্ট কোলিয়ার" },
  { text: "আগামীকালের সাফল্যের একমাত্র বাধা হতে পারে আমাদের আজকের সন্দেহগুলো।", author: "ফ্রাঙ্কলিন ডি. রুজভেল্ট" }
];

export function EducationManager() {
  const { theme } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<EducationalNote[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const activeCourse = selectedCourse ? courses.find(c => c.id === selectedCourse.id) || selectedCourse : null;
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseId, setFilterCourseId] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Auto-clear search query when navigating into or out of a course module
  useEffect(() => {
    setSearchQuery('');
  }, [selectedCourse?.id]);

  // Year Tabs Filter & Custom Tabs State
  const [yearTabs, setYearTabs] = useState<string[]>(() => {
    const saved = localStorage.getItem('education_year_tabs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  });

  const [selectedYearTab, setSelectedYearTab] = useState<string>('All');
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [newTabInput, setNewTabInput] = useState('');

  // Scroll logic for Tabs Bar
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabScroll = useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  }, []);

  useEffect(() => {
    checkTabScroll();
    window.addEventListener('resize', checkTabScroll);
    return () => window.removeEventListener('resize', checkTabScroll);
  }, [checkTabScroll, yearTabs, selectedCourse]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const amount = direction === 'left' ? -180 : 180;
      tabsContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkTabScroll, 250);
    }
  };

  const handleAddYearTab = (tabName: string) => {
    const trimmed = tabName.trim();
    if (!trimmed) return null;
    if (yearTabs.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.info(`Tab "${trimmed}" already exists`);
      return trimmed;
    }
    const updated = [...yearTabs, trimmed];
    setYearTabs(updated);
    localStorage.setItem('education_year_tabs', JSON.stringify(updated));
    toast.success(`Added tab "${trimmed}"`);
    setNewTabInput('');
    setIsAddTabModalOpen(false);
    return trimmed;
  };

  const [tabToDeleteConfirm, setTabToDeleteConfirm] = useState<string | null>(null);

  const confirmAndDeleteYearTab = () => {
    if (!tabToDeleteConfirm) return;
    const tabName = tabToDeleteConfirm;
    const updated = yearTabs.filter(t => t !== tabName);
    setYearTabs(updated);
    localStorage.setItem('education_year_tabs', JSON.stringify(updated));
    if (selectedYearTab === tabName) {
      setSelectedYearTab('All');
    }
    toast.success(`Deleted tab "${tabName}"`);
    setTabToDeleteConfirm(null);
  };

  // Modals / Forms States
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);
  const [isViewNoteModalOpen, setIsViewNoteModalOpen] = useState(false);
  const [activeViewNote, setActiveViewNote] = useState<EducationalNote | null>(null);

  // Edit states
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingNote, setEditingNote] = useState<EducationalNote | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Course Form Fields
  const [courseName, setCourseName] = useState('');
  const [courseYear, setCourseYear] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseCredit, setCourseCredit] = useState('');
  const [courseAdditionalLinks, setCourseAdditionalLinks] = useState<{ title: string; url: string }[]>([]);
  const [newCourseLinkTitle, setNewCourseLinkTitle] = useState('');
  const [newCourseLinkUrl, setNewCourseLinkUrl] = useState('');
  const [activeViewCourseResources, setActiveViewCourseResources] = useState<Course | null>(null);

  const handleAddCourseAdditionalLink = () => {
    const trimmedTitle = newCourseLinkTitle.trim();
    const trimmedUrl = newCourseLinkUrl.trim();
    if (!trimmedTitle || !trimmedUrl) {
      toast.error('Please enter both Link Title and URL!');
      return;
    }
    let validUrl = trimmedUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    setCourseAdditionalLinks(prev => [...prev, { title: trimmedTitle, url: validUrl }]);
    setNewCourseLinkTitle('');
    setNewCourseLinkUrl('');
    toast.success(`Added course resource link: ${trimmedTitle}`);
  };

  const handleRemoveCourseAdditionalLink = (index: number) => {
    setCourseAdditionalLinks(prev => prev.filter((_, i) => i !== index));
  };
  const [courseImageOption, setCourseImageOption] = useState('upload'); // 'upload' | 'library'
  const [courseImageUrl, setCourseImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageLibrary, setImageLibrary] = useState<string[]>(() => {
    const saved = localStorage.getItem('education_image_library');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return PRESET_COVERS.map(p => p.url);
  });

  const saveImageToLibrary = (url: string) => {
    if (!url) return;
    setImageLibrary(prev => {
      if (prev.includes(url)) return prev;
      const updated = [url, ...prev];
      localStorage.setItem('education_image_library', JSON.stringify(updated));
      return updated;
    });
  };

  const uploadAndSetImage = async (file: File) => {
    setIsUploadingImage(true);
    const toastId = toast.loading('ছবি আপলোড হচ্ছে...');
    try {
      const url = await uploadImageToImgBB(file);
      if (url) {
        setCourseImageUrl(url);
        saveImageToLibrary(url);
        toast.success('ছবি সফলভাবে আপলোড হয়েছে ও লাইব্রেরিতে যুক্ত হয়েছে!', { id: toastId });
      } else {
        // Fallback to local Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setCourseImageUrl(base64data);
          saveImageToLibrary(base64data);
          toast.success('ছবি আপলোড হয়েছে (লোকাল স্টোরেজ)', { id: toastId });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      toast.error('ছবি আপলোড ব্যর্থ হয়েছে', { id: toastId });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImagePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await uploadAndSetImage(file);
          break;
        }
      }
    }
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await uploadAndSetImage(file);
      }
    }
  };

  // Global paste handler when Course Modal is open
  useEffect(() => {
    if (!isCourseModalOpen) return;

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        // Look for image items in clipboard (copied from Snipping Tool / print screen)
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            setCourseImageOption('upload'); // Automatically switch to upload view
            await uploadAndSetImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isCourseModalOpen]);

  // Note Form Fields
  const [noteChatTitle, setNoteChatTitle] = useState('');
  const [noteAiProvider, setNoteAiProvider] = useState('ChatGPT');
  const [noteChapter, setNoteChapter] = useState('');
  const [noteCategories, setNoteCategories] = useState<string[]>([]);
  const [noteQuestion, setNoteQuestion] = useState('');
  const [noteQuestionCount, setNoteQuestionCount] = useState<number>(1);
  const [noteGmail, setNoteGmail] = useState('');
  const [noteChatLink, setNoteChatLink] = useState('');
  const [noteAdditionalLinks, setNoteAdditionalLinks] = useState<{ title: string; url: string }[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [noteQuestionImages, setNoteQuestionImages] = useState<string[]>([]);
  const [isUploadingNoteImage, setIsUploadingNoteImage] = useState(false);

  // Lightbox Modal for viewing, navigating, and zooming in equation/question images
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxImageTitle, setLightboxImageTitle] = useState<string>('');
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

  // Helper to open lightbox with list of images and specific index
  const openLightbox = (images: string[], initialIndex: number = 0, title: string = '') => {
    if (!images || images.length === 0) return;
    const safeIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
    setLightboxImages(images);
    setLightboxIndex(safeIndex);
    setLightboxImageTitle(title);
    setLightboxZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setLightboxImages([]);
    setLightboxIndex(0);
    setLightboxZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleNextLightboxImage = () => {
    if (lightboxImages.length <= 1) return;
    setLightboxIndex(prev => (prev + 1) % lightboxImages.length);
    setLightboxZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handlePrevLightboxImage = () => {
    if (lightboxImages.length <= 1) return;
    setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length);
    setLightboxZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Keyboard navigation & zoom handlers
  useEffect(() => {
    if (lightboxImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        handleNextLightboxImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevLightboxImage();
      } else if (e.key === '+' || e.key === '=') {
        setLightboxZoom(prev => Math.min(4, prev + 0.25));
      } else if (e.key === '-') {
        setLightboxZoom(prev => Math.max(0.5, prev - 0.25));
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        setLightboxZoom(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImages.length]);

  // Upload and attach image to Note form
  const uploadAndAddNoteImage = async (file: File) => {
    setIsUploadingNoteImage(true);
    const toastId = toast.loading('সমীকরণ / প্রশ্নের ছবি আপলোড হচ্ছে...');
    try {
      const url = await uploadImageToImgBB(file);
      if (url) {
        setNoteQuestionImages(prev => [...prev, url]);
        toast.success('সমীকরণের ছবি সফলভাবে যুক্ত হয়েছে!', { id: toastId });
      } else {
        // Fallback to local Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setNoteQuestionImages(prev => [...prev, base64data]);
          toast.success('সমীকরণের ছবি যুক্ত হয়েছে (লোকাল স্টোরেজ)', { id: toastId });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      toast.error('ছবি আপলোড ব্যর্থ হয়েছে', { id: toastId });
    } finally {
      setIsUploadingNoteImage(false);
    }
  };

  const handleNoteImageFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        await uploadAndAddNoteImage(files[i]);
      }
    }
    e.target.value = '';
  };

  const handleRemoveNoteImage = (index: number) => {
    setNoteQuestionImages(prev => prev.filter((_, i) => i !== index));
    toast.info('ছবি সরানো হয়েছে');
  };

  const handleNoteImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          await uploadAndAddNoteImage(files[i]);
        }
      }
    }
  };

  // Global paste handler when Note Modal is open (Ctrl + V for screenshots)
  useEffect(() => {
    if (!isNoteModalOpen) return;

    const handleNoteModalGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await uploadAndAddNoteImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleNoteModalGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleNoteModalGlobalPaste);
    };
  }, [isNoteModalOpen]);

  const handleAddAdditionalLink = () => {
    const trimmedTitle = newLinkTitle.trim();
    const trimmedUrl = newLinkUrl.trim();
    if (!trimmedTitle || !trimmedUrl) {
      toast.error('Please enter both Link Title and URL!');
      return;
    }
    let validUrl = trimmedUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    setNoteAdditionalLinks(prev => [...prev, { title: trimmedTitle, url: validUrl }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    toast.success(`Added link: ${trimmedTitle}`);
  };

  const handleRemoveAdditionalLink = (index: number) => {
    setNoteAdditionalLinks(prev => prev.filter((_, i) => i !== index));
  };

  // Predefined chapters temp list in chapter manager
  const [tempChapters, setTempChapters] = useState<string[]>([]);
  const [newChapterName, setNewChapterName] = useState('');

  // Motivation & Timer States
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 minutes
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [streakCount, setStreakCount] = useState(3); // Sample interactive streak count

  // Test connection to Firestore according to rules
  useEffect(() => {
    async function verifyConnection() {
      if (!db) return;
      try {
        await getDocFromServer(doc(db, 'test_connection', 'ping'));
      } catch (error) {
        // Safe to ignore if it is missing or permission denied, since test_connection is not a real collection.
      }
    }
    verifyConnection();
  }, []);

  // Fetch Courses
  useEffect(() => {
    if (!db || !auth?.currentUser) return;
    setLoading(true);

    const q = query(
      collection(db, 'courses'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCourses: Course[] = [];
      snapshot.forEach((doc) => {
        fetchedCourses.push({ id: doc.id, ...doc.data() } as Course);
      });
      setCourses(fetchedCourses);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    });

    return () => unsubscribe();
  }, [auth?.currentUser]);

  // Fetch Notes
  useEffect(() => {
    if (!db || !auth?.currentUser) return;

    const q = query(
      collection(db, 'educationalNotes'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes: EducationalNote[] = [];
      snapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() } as EducationalNote);
      });
      setNotes(fetchedNotes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'educationalNotes');
    });

    return () => unsubscribe();
  }, [auth?.currentUser]);

  // Change quote automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Pomodoro Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
      toast.success(
        timerMode === 'work' 
          ? "Great job focusing! Time for a short break." 
          : "Break is over! Let's get back to learning!"
      );
      // Automatically switch mode
      if (timerMode === 'work') {
        handleTimerModeChange('shortBreak');
      } else {
        handleTimerModeChange('work');
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, timerMode]);

  const handleTimerModeChange = (mode: 'work' | 'shortBreak' | 'longBreak') => {
    setTimerMode(mode);
    setTimerActive(false);
    if (mode === 'work') setTimerSeconds(1500); // 25m
    else if (mode === 'shortBreak') setTimerSeconds(300); // 5m
    else if (mode === 'longBreak') setTimerSeconds(900); // 15m
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Create or Update Course
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth?.currentUser) return;

    if (!courseName.trim() || !courseYear.trim()) {
      toast.error('Please fill in Course Name and Year');
      return;
    }

    const imgUrl = courseImageUrl.trim() || PRESET_COVERS[0].url;

    const courseData = {
      userId: auth.currentUser.uid,
      name: courseName.trim(),
      year: courseYear.trim(),
      code: courseCode.trim() || '',
      credit: courseCredit.trim() || '',
      imageUrl: imgUrl,
      chapters: editingCourse ? editingCourse.chapters || [] : ['General', 'Chapter 1', 'Chapter 2'],
      additionalLinks: courseAdditionalLinks,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), {
          ...courseData,
          id: editingCourse.id,
          createdAt: editingCourse.createdAt || new Date().toISOString()
        });
        toast.success('Course updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'courses'), {
          ...courseData,
          id: '', // Will update or just rely on Firebase auto ID
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'courses', docRef.id), { id: docRef.id });
        toast.success('Course created successfully!');
      }

      // Reset form & close
      setCourseName('');
      setCourseYear('');
      setCourseCode('');
      setCourseCredit('');
      setCourseImageUrl('');
      setCourseAdditionalLinks([]);
      setNewCourseLinkTitle('');
      setNewCourseLinkUrl('');
      setEditingCourse(null);
      setIsCourseModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingCourse ? OperationType.UPDATE : OperationType.CREATE, 'courses');
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;

    if (window.confirm("Are you sure you want to delete this course? All associated notes will remain but won't be visible inside this course.")) {
      try {
        await deleteDoc(doc(db, 'courses', id));
        toast.success('Course deleted!');
        if (selectedCourse?.id === id) {
          setSelectedCourse(null);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `courses/${id}`);
      }
    }
  };

  // Edit Course Trigger / Open Course Modal
  const openCourseModal = (courseToEdit?: Course | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (courseToEdit) {
      setEditingCourse(courseToEdit);
      setCourseName(courseToEdit.name);
      setCourseYear(courseToEdit.year);
      setCourseCode(courseToEdit.code || '');
      setCourseCredit(courseToEdit.credit || '');
      setCourseImageUrl(courseToEdit.imageUrl || '');
      setCourseAdditionalLinks(courseToEdit.additionalLinks || []);
      setNewCourseLinkTitle('');
      setNewCourseLinkUrl('');
      setCourseImageOption('library');
      if (courseToEdit.imageUrl) {
        saveImageToLibrary(courseToEdit.imageUrl);
      }
    } else {
      setEditingCourse(null);
      setCourseName('');
      setCourseYear('');
      setCourseCode('');
      setCourseCredit('');
      setCourseImageUrl('');
      setCourseAdditionalLinks([]);
      setNewCourseLinkTitle('');
      setNewCourseLinkUrl('');
      setCourseImageOption('upload');
    }
    setIsCourseModalOpen(true);
  };

  // Chapters Manager Save
  const openChaptersManager = () => {
    if (!activeCourse) return;
    setTempChapters([...(activeCourse.chapters || [])]);
    setIsChaptersModalOpen(true);
  };

  const handleAddTempChapter = () => {
    if (!newChapterName.trim()) return;
    if (tempChapters.includes(newChapterName.trim())) {
      toast.error('Chapter already exists!');
      return;
    }
    setTempChapters([...tempChapters, newChapterName.trim()]);
    setNewChapterName('');
  };

  const handleRemoveTempChapter = (chap: string) => {
    setTempChapters(tempChapters.filter(c => c !== chap));
  };

  const handleSaveChapters = async () => {
    if (!db || !activeCourse || !auth?.currentUser) return;

    try {
      const courseRef = doc(db, 'courses', activeCourse.id);
      
      // Update with all keys to fully satisfy isValidCourse security rules for any legacy course documents
      const updatedPayload = {
        id: activeCourse.id,
        userId: activeCourse.userId || auth.currentUser.uid,
        name: activeCourse.name,
        year: activeCourse.year,
        imageUrl: activeCourse.imageUrl || '',
        chapters: tempChapters,
        createdAt: activeCourse.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(courseRef, updatedPayload);

      setSelectedCourse({
        ...activeCourse,
        ...updatedPayload
      });

      toast.success('কোর্সের অধ্যায়গুলো সফলভাবে সংরক্ষণ করা হয়েছে!');
      setIsChaptersModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${activeCourse.id}`);
    }
  };

  // Note Create/Edit Submit
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth?.currentUser || !selectedCourse) return;

    if (!noteChatTitle.trim() || !noteGmail.trim()) {
      toast.error('Please fill in Chat Title and Gmail Account');
      return;
    }

    if (!noteQuestion.trim() && noteQuestionImages.length === 0) {
      toast.error('অনুগ্রহ করে প্রশ্নের বিবরণ লিখুন অথবা সমীকরণের ছবি/স্ক্রিনশট যুক্ত করুন');
      return;
    }

    if (noteCategories.length === 0) {
      toast.error('Please select at least one type (Suggestions, Notes, or Syllabus)');
      return;
    }

    const finalQuestion = noteQuestion.trim() || (noteQuestionImages.length > 0 ? '(সমীকরণ / প্রশ্নের ছবি সংযুক্ত)' : '');

    const noteData = {
      courseId: selectedCourse.id,
      userId: auth.currentUser.uid,
      chatTitle: noteChatTitle.trim(),
      categories: noteCategories,
      chapter: noteChapter || 'General',
      question: finalQuestion,
      questionCount: Number(noteQuestionCount) || 1,
      gmail: noteGmail.trim(),
      aiProvider: noteAiProvider,
      chatLink: noteChatLink.trim() || '',
      additionalLinks: noteAdditionalLinks,
      questionImages: noteQuestionImages,
      questionImageUrl: noteQuestionImages[0] || '',
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingNote) {
        await updateDoc(doc(db, 'educationalNotes', editingNote.id), noteData);
        toast.success('Note updated!');
      } else {
        const docRef = await addDoc(collection(db, 'educationalNotes'), {
          ...noteData,
          id: '',
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'educationalNotes', docRef.id), { id: docRef.id });
        toast.success('New AI note saved!');
      }

      // Reset Note fields
      setNoteChatTitle('');
      setNoteChapter('');
      setNoteCategories([]);
      setNoteQuestion('');
      setNoteQuestionCount(1);
      setNoteGmail('');
      setNoteChatLink('');
      setNoteAdditionalLinks([]);
      setNewLinkTitle('');
      setNewLinkUrl('');
      setNoteQuestionImages([]);
      setEditingNote(null);
      setIsNoteModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingNote ? OperationType.UPDATE : OperationType.CREATE, 'educationalNotes');
    }
  };

  // Edit Note trigger
  const handleEditNoteTrigger = (note: EducationalNote) => {
    setEditingNote(note);
    setNoteChatTitle(note.chatTitle);
    setNoteAiProvider(note.aiProvider);
    setNoteChapter(note.chapter);
    setNoteCategories(note.categories);
    setNoteQuestion(note.question);
    setNoteQuestionCount(note.questionCount || 1);
    setNoteGmail(note.gmail);
    setNoteChatLink(note.chatLink || '');
    setNoteAdditionalLinks(note.additionalLinks || []);
    setNoteQuestionImages(note.questionImages || (note.questionImageUrl ? [note.questionImageUrl] : []));
    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsNoteModalOpen(true);
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!db) return;
    if (window.confirm('Are you sure you want to delete this AI note?')) {
      try {
        await deleteDoc(doc(db, 'educationalNotes', id));
        toast.success('Note deleted successfully');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `educationalNotes/${id}`);
      }
    }
  };

  // Toggle Category Checkbox
  const handleCategoryCheckboxChange = (cat: string) => {
    if (noteCategories.includes(cat)) {
      setNoteCategories(noteCategories.filter(c => c !== cat));
    } else {
      setNoteCategories([...noteCategories, cat]);
    }
  };

  const handleCopyChatTitle = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Chat Title copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Search Logic
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          course.year.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (course.code && course.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesYearTab = selectedYearTab === 'All' || course.year.toLowerCase().trim() === selectedYearTab.toLowerCase().trim();

    return matchesSearch && matchesYearTab;
  });

  const filteredNotes = notes.filter(note => {
    // If inside a selected course, only show notes for that course
    if (selectedCourse && note.courseId !== selectedCourse.id) return false;

    // Find note's 1-based serial number in the current course
    const courseNotes = selectedCourse 
      ? notes.filter(n => n.courseId === selectedCourse.id)
      : notes;
    const serialIndex = courseNotes.findIndex(n => n.id === note.id) + 1;

    const rawQuery = searchQuery.trim().toLowerCase();

    if (rawQuery) {
      const serialStr = serialIndex.toString();
      const paddedSerial = serialIndex < 10 ? `0${serialIndex}` : `${serialIndex}`;

      const matchesSerial = 
        rawQuery === serialStr ||
        rawQuery === paddedSerial ||
        rawQuery === `#${serialStr}` ||
        rawQuery === `#${paddedSerial}` ||
        rawQuery === `note ${serialStr}` ||
        rawQuery === `note ${paddedSerial}` ||
        rawQuery === `note-${serialStr}` ||
        rawQuery === `note-${paddedSerial}` ||
        rawQuery === `sl ${serialStr}` ||
        rawQuery === `sl ${paddedSerial}` ||
        rawQuery === `sl-${serialStr}` ||
        rawQuery === `sl-${paddedSerial}` ||
        rawQuery === `ক্রমিক ${serialStr}` ||
        rawQuery === `ক্রমিক-${serialStr}` ||
        rawQuery === `ক্রমিক ${paddedSerial}`;

      const qCount = note.questionCount || 1;
      const matchesText = note.chatTitle.toLowerCase().includes(rawQuery) ||
                          note.chapter.toLowerCase().includes(rawQuery) ||
                          note.question.toLowerCase().includes(rawQuery) ||
                          note.gmail.toLowerCase().includes(rawQuery) ||
                          note.aiProvider.toLowerCase().includes(rawQuery) ||
                          qCount.toString() === rawQuery ||
                          `${qCount}টি`.includes(rawQuery) ||
                          note.categories.some(cat => cat.toLowerCase().includes(rawQuery));

      if (!matchesSerial && !matchesText) return false;
    }

    const matchesCourse = filterCourseId === 'all' || note.courseId === filterCourseId;
    const matchesProvider = filterProvider === 'all' || note.aiProvider === filterProvider;
    const matchesCategory = filterCategory === 'all' || note.categories.includes(filterCategory);

    return matchesCourse && matchesProvider && matchesCategory;
  });

  // Count helper
  const getNotesCountForCourse = (courseId: string) => {
    return notes.filter(n => n.courseId === courseId).length;
  };

  return (
    <div className="w-full space-y-6" id="educational-workspace-container">
      
      {/* Header with Motivation Section */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
        
        {/* Welcome & Motivational Quote */}
        <div className={`flex-1 p-4 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all ${
          theme === 'dark' 
            ? 'bg-[#111827] border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <GraduationCap size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI Educational Workspace</h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Track, organize, and recall insights from your AI study chats
                </p>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuoteIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="mt-3 sm:mt-4"
              >
                <p className={`text-base sm:text-lg italic font-medium leading-relaxed font-serif ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                }`}>
                  "{MOTIVATIONAL_QUOTES[currentQuoteIndex].text}"
                </p>
                <p className="text-xs text-indigo-500 font-semibold mt-2">
                  — {MOTIVATIONAL_QUOTES[currentQuoteIndex].author}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200/50 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500 animate-pulse shrink-0" size={18} />
              <div>
                <span className="text-[10px] sm:text-xs block text-slate-400">Current Streak</span>
                <span className={`font-bold text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{streakCount} Days Focused</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-500 shrink-0" size={18} />
              <div>
                <span className="text-[10px] sm:text-xs block text-slate-400">Notes Logged</span>
                <span className={`font-bold text-xs sm:text-sm ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{notes.length} Sessions</span>
              </div>
            </div>
            <div className="w-full sm:w-auto sm:ml-auto">
              <button 
                onClick={() => setStreakCount(prev => prev + 1)}
                className="w-full sm:w-auto text-center text-[10px] sm:text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold px-3 py-1.5 rounded-full transition-all border border-indigo-500/20 shrink-0"
              >
                + Complete Study
              </button>
            </div>
          </div>
        </div>

        {/* Elegant Pomodoro Focus Timer Widget */}
        <div className={`w-full lg:w-80 p-4 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all ${
          theme === 'dark' 
            ? 'bg-[#111827] border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <Timer size={18} />
                <span>Focus Timer</span>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => handleTimerModeChange('work')} 
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    timerMode === 'work' 
                      ? 'bg-rose-500 text-white' 
                      : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                  }`}
                >
                  Work
                </button>
                <button 
                  onClick={() => handleTimerModeChange('shortBreak')} 
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                    timerMode === 'shortBreak' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                  }`}
                >
                  Break
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center my-2">
              <div className={`text-4xl font-extrabold tracking-widest font-mono ${
                timerActive ? 'text-rose-500 animate-pulse' : theme === 'dark' ? 'text-slate-100' : 'text-slate-800'
              }`}>
                {formatTime(timerSeconds)}
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                {timerMode === 'work' ? 'Time to Learn' : 'Take a breath'}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5">
            <button
              onClick={() => setTimerActive(!timerActive)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                timerActive 
                  ? 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300' 
                  : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/10'
              }`}
            >
              {timerActive ? <Pause size={14} /> : <Play size={14} />}
              {timerActive ? 'Pause' : 'Start Focus'}
            </button>
            <button
              onClick={() => handleTimerModeChange(timerMode)}
              className="p-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 rounded-xl transition-all"
              title="Reset Timer"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Global Toolbar / Search */}
      <div className={`p-4 sm:p-6 rounded-2xl border mb-6 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between transition-all max-w-full overflow-hidden ${
        theme === 'dark' ? 'bg-[#111827] border-white/5' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={selectedCourse ? "Search note #, chat title, question, gmail, chapter..." : "Search course name or year..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 ${searchQuery ? 'pr-9' : 'pr-4'} py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
              theme === 'dark' 
                ? 'bg-black/20 border-white/5 text-slate-100 placeholder-slate-500 focus:border-indigo-500' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 p-0.5 rounded-full transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Year Filter Tabs (Visible when viewing course list) */}
        {!selectedCourse && (
          <div className="flex-1 min-w-0 flex items-center gap-1.5 relative px-1 w-full md:w-auto">
            {/* Left Arrow Button - ONLY shown when overflow exists */}
            {(canScrollLeft || canScrollRight) && (
              <button
                type="button"
                onClick={() => scrollTabs('left')}
                disabled={!canScrollLeft}
                className={`p-1.5 rounded-lg border text-slate-400 shrink-0 transition-all ${
                  canScrollLeft 
                    ? 'hover:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer' 
                    : 'opacity-30 cursor-not-allowed'
                } ${
                  theme === 'dark' ? 'border-white/10 bg-[#1e293b]' : 'border-slate-200 bg-slate-50'
                }`}
                title="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            {/* Scrollable Container */}
            <div 
              ref={tabsContainerRef}
              onScroll={checkTabScroll}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 scroll-smooth min-w-0 w-full"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* 'All' Tab */}
              <button
                type="button"
                onClick={() => setSelectedYearTab('All')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  selectedYearTab === 'All'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                }`}
              >
                All Courses
              </button>

              {/* Dynamic Year Tabs */}
              {yearTabs.map((tab) => {
                const isSelected = selectedYearTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedYearTab(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : theme === 'dark'
                          ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}

              {/* Add Custom Tab Button */}
              <button
                type="button"
                onClick={() => setIsAddTabModalOpen(true)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1 border border-dashed ${
                  theme === 'dark' 
                    ? 'border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10' 
                    : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                }`}
                title="Add custom year/category tab"
              >
                <Plus size={14} />
                <span>Add Tab</span>
              </button>
            </div>

            {/* Right Arrow Button - ONLY shown when overflow exists */}
            {(canScrollLeft || canScrollRight) && (
              <button
                type="button"
                onClick={() => scrollTabs('right')}
                disabled={!canScrollRight}
                className={`p-1.5 rounded-lg border text-slate-400 shrink-0 transition-all ${
                  canScrollRight 
                    ? 'hover:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer' 
                    : 'opacity-30 cursor-not-allowed'
                } ${
                  theme === 'dark' ? 'border-white/10 bg-[#1e293b]' : 'border-slate-200 bg-slate-50'
                }`}
                title="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto min-w-0">
          {/* Dynamic Filters shown only in detailed course page or global notes lookup */}
          {selectedCourse && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto min-w-0">
              <div className="flex items-center gap-1.5 bg-slate-500/5 dark:bg-white/5 p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex-1 sm:flex-initial min-w-[130px]">
                <Filter size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0 ml-1" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`w-full text-xs font-semibold py-1 px-1 rounded-lg border-0 focus:outline-none bg-transparent cursor-pointer ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                  }`}
                >
                  <option value="all" className={theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>All Chapters</option>
                  {(selectedCourse.chapters || []).map((ch, i) => (
                    <option key={i} value={ch} className={theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>{ch}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-500/5 dark:bg-white/5 p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex-1 sm:flex-initial min-w-[130px]">
                <Sparkles size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0 ml-1" />
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className={`w-full text-xs font-semibold py-1 px-1 rounded-lg border-0 focus:outline-none bg-transparent cursor-pointer ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                  }`}
                >
                  <option value="all" className={theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>All Providers</option>
                  {AI_PROVIDERS.map(p => (
                    <option key={p} value={p} className={theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!selectedCourse && (
            <button
              onClick={() => openCourseModal()}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Plus size={14} /> Add New Course
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Conditional Rendering (Courses Grid or Single Course View) */}
      <AnimatePresence mode="wait">
        {!selectedCourse ? (
          <motion.div
            key="courses-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500" />
                <span>My Active Courses ({filteredCourses.length})</span>
              </h2>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-400 mt-4">Loading your courses...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${
                theme === 'dark' ? 'bg-[#111827] border-white/5' : 'bg-white border-slate-200'
              }`}>
                <GraduationCap className="mx-auto text-slate-400 mb-4" size={48} />
                <h3 className="font-bold text-lg mb-1">No courses found</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Create your first educational course module to keep track of your AI solving history!
                </p>
                <button
                  onClick={() => openCourseModal()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  Create Your First Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredCourses.map((course) => {
                  const count = getNotesCountForCourse(course.id);
                  return (
                    <motion.div
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                      className={`cursor-pointer overflow-hidden border group transition-all p-4.5 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                        theme === 'dark' 
                          ? 'bg-[#111827] border-white/10 hover:border-indigo-500/40 hover:bg-[#131d31] text-slate-100' 
                          : 'bg-white border-slate-200/80 hover:border-indigo-300 text-slate-900'
                      }`}
                      style={{ borderRadius: '4px' }}
                    >
                      <div className="space-y-3">
                        {/* Top Badges Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Course Code */}
                            {course.code && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-[4px] border ${
                                theme === 'dark'
                                  ? 'text-sky-400 bg-sky-950/50 border-sky-800/40'
                                  : 'text-sky-700 bg-sky-50 border-sky-200'
                              }`}>
                                {course.code}
                              </span>
                            )}
                            {/* Credits */}
                            {course.credit && (
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] ${
                                theme === 'dark'
                                  ? 'text-slate-300 bg-slate-800/60'
                                  : 'text-slate-600 bg-slate-100'
                              }`}>
                                {course.credit.toLowerCase().includes('credit') ? course.credit : `${course.credit} Credits`}
                              </span>
                            )}
                            {/* Year */}
                            {course.year && (
                              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-[4px] border ${
                                theme === 'dark'
                                  ? 'text-indigo-400 bg-indigo-950/50 border-indigo-800/40'
                                  : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                              }`}>
                                {course.year}
                              </span>
                            )}
                          </div>

                          {/* Notes Tag */}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-[4px] border flex items-center gap-1.5 shrink-0 ${
                            theme === 'dark'
                              ? 'text-indigo-300 bg-indigo-950/60 border-indigo-800/50'
                              : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                          }`}>
                            <Layers size={12} className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
                            <span>{count} {count === 1 ? 'Note' : 'Notes'}</span>
                          </span>
                        </div>

                        {/* Course Title */}
                        <h3 className={`font-bold text-base sm:text-lg transition-colors line-clamp-2 ${
                          theme === 'dark'
                            ? 'text-slate-100 group-hover:text-indigo-400'
                            : 'text-slate-900 group-hover:text-indigo-600'
                        }`}>
                          {course.name}
                        </h3>
                      </div>

                      {/* Footer: Last Updated & Action Buttons */}
                      <div className={`flex items-center justify-between pt-3 border-t mt-4 ${
                        theme === 'dark' ? 'border-white/5 text-slate-400' : 'border-slate-100 text-slate-500'
                      }`}>
                        <span className="text-[11px] flex items-center gap-1.5 font-medium">
                          <Clock size={11} className="text-slate-400" />
                          <span>Updated: {new Date(course.updatedAt).toLocaleDateString()}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveViewCourseResources(course);
                            }}
                            className={`p-1.5 rounded-[4px] transition-all ${
                              theme === 'dark' 
                                ? 'text-slate-400 hover:text-indigo-400 hover:bg-white/5' 
                                : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title="View Course Resources & Links"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openCourseModal(course, e)}
                            className={`p-1.5 rounded-[4px] transition-all ${
                              theme === 'dark' 
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title="Edit Course Details"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCourse(course.id, e)}
                            className={`p-1.5 rounded-[4px] transition-all ${
                              theme === 'dark'
                                ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="Delete Course"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* Single Course View containing the Detailed Table */
          <motion.div
            key="course-detailed-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Back Header & Title */}
            <div className={`p-6 rounded-2xl border overflow-hidden relative ${
              theme === 'dark' ? 'bg-[#111827] border-white/5' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              {/* Background cover watermark */}
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none">
                <img 
                  src={selectedCourse.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover mask-gradient-to-l" 
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-3 sm:gap-4">
                  <button
                    onClick={() => {
                      setSelectedCourse(null);
                      setFilterCategory('all');
                      setFilterProvider('all');
                    }}
                    className={`p-2.5 rounded-xl border transition-all shrink-0 mt-0.5 ${
                      theme === 'dark' 
                        ? 'border-white/5 bg-white/5 hover:bg-white/10 text-slate-200' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-extrabold px-2.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">
                        {selectedCourse.year}
                      </span>
                      {selectedCourse.code && (
                        <span className="text-[10px] bg-indigo-600/90 text-white font-extrabold px-2.5 py-0.5 rounded uppercase tracking-widest">
                          {selectedCourse.code}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Course Module
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{selectedCourse.name}</h2>
                      {selectedCourse.credit && (
                        <span className="text-xs bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-400 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/25 whitespace-nowrap">
                          {selectedCourse.credit.toLowerCase().includes('credit') ? selectedCourse.credit : `${selectedCourse.credit} Credits`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/50 dark:border-white/5">
                  <button
                    onClick={openChaptersManager}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      theme === 'dark' 
                        ? 'border-white/5 bg-white/5 hover:bg-white/10 text-slate-200' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Settings size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">Manage Chapters</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingNote(null);
                      setNoteChatTitle('');
                      setNoteChapter(selectedCourse.chapters?.[0] || 'General');
                      setNoteCategories([]);
                      setNoteQuestion('');
                      setNoteQuestionCount(1);
                      setNoteGmail('');
                      setNoteChatLink('');
                      setNoteAdditionalLinks([]);
                      setNewLinkTitle('');
                      setNewLinkUrl('');
                      setIsNoteModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 hover:-translate-y-0.5"
                  >
                    <Plus size={14} className="shrink-0" />
                    <span className="truncate">Add New Note</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Notes Table / Cards */}
            <div className={`border rounded-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#111827] border-white/5 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="p-4 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <span>Notes List ({filteredNotes.length})</span>
                </span>
                
                {searchQuery && (
                  <span className="text-[10px] bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded font-medium truncate max-w-[150px] sm:max-w-none">
                    Filtered by: "{searchQuery}"
                  </span>
                )}
              </div>

              {/* Mobile Note Cards View (Visible on Small Screens) */}
              <div className="block md:hidden p-3 space-y-3">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <HelpCircle className="mx-auto text-slate-500 mb-2" size={28} />
                    No educational notes saved for this course yet or matching your search.
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const courseNotes = selectedCourse 
                      ? notes.filter(n => n.courseId === selectedCourse.id)
                      : notes;
                    const serialIndex = courseNotes.findIndex(n => n.id === note.id) + 1;
                    const serialFormatted = serialIndex > 0 ? (serialIndex < 10 ? `0${serialIndex}` : `${serialIndex}`) : '01';

                    return (
                      <div 
                        key={note.id}
                        className={`p-3.5 rounded-2xl border space-y-3 transition-all ${
                          theme === 'dark'
                            ? 'bg-black/20 border-white/5 text-slate-200'
                            : 'bg-white border-slate-200/90 text-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200'
                        }`}
                      >
                        {/* Top Row: Serial # + AI Provider + Question Count */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono font-extrabold border ${
                              theme === 'dark'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                            }`}>
                              #{serialFormatted}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              note.aiProvider === 'ChatGPT' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                              note.aiProvider === 'Gemini' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                              note.aiProvider === 'Google AI Studio' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                              note.aiProvider === 'Claude' ? 'bg-amber-500/10 text-amber-700 dark:text-orange-400 border-amber-500/20' :
                              'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            }`}>
                              {note.aiProvider}
                            </span>
                          </div>

                          <span className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded border ${
                            theme === 'dark'
                              ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                          }`}>
                            ({note.questionCount || 1}টি প্রশ্ন)
                          </span>
                        </div>

                        {/* Title Row */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-extrabold text-sm sm:text-base leading-snug flex-1 ${
                            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                          }`}>
                            {note.chatTitle}
                          </h4>
                          <button
                            onClick={() => handleCopyChatTitle(note.chatTitle, note.id)}
                            className="p-1.5 hover:bg-slate-500/10 rounded text-slate-400 hover:text-indigo-500 shrink-0"
                            title="Copy Chat Title"
                          >
                            {copiedId === note.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>

                        {/* Chapter & Categories */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200/80'
                          }`}>
                            {note.chapter}
                          </span>
                          {note.categories.map((cat, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded uppercase font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {cat}
                            </span>
                          ))}
                        </div>

                        {/* Gmail */}
                        {note.gmail && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                            <Mail size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{note.gmail}</span>
                          </div>
                        )}

                        {/* Question snippet & Math images */}
                        <div className={`p-2.5 rounded-xl border transition-colors space-y-2 ${
                          theme === 'dark' 
                            ? 'bg-black/20 text-slate-300 border-white/5' 
                            : 'bg-slate-50 text-slate-800 border-slate-200/80 font-medium'
                        }`}>
                          {((note.questionImages && note.questionImages.length > 0) || note.questionImageUrl) && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                              {(note.questionImages || (note.questionImageUrl ? [note.questionImageUrl] : [])).map((imgUrl, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const allImages = note.questionImages && note.questionImages.length > 0 ? note.questionImages : (note.questionImageUrl ? [note.questionImageUrl] : []);
                                    openLightbox(allImages, i, note.chatTitle);
                                  }}
                                  className="shrink-0 w-16 h-12 rounded-lg overflow-hidden border border-indigo-500/30 relative group shadow-xs cursor-pointer"
                                  title="বড় করে সমীকরণ দেখুন"
                                >
                                  <img 
                                    src={imgUrl} 
                                    alt="Math equation" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-[8px] font-bold text-white px-1 rounded">
                                    #{i + 1}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-xs line-clamp-2">
                            {note.question}
                          </p>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-white/5 text-xs">
                          <span className="text-[10px] text-slate-400">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveViewNote(note);
                                setIsViewNoteModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-bold flex items-center gap-1"
                            >
                              <FileText size={13} />
                              <span>View</span>
                            </button>
                            {note.chatLink && (
                              <a
                                href={note.chatLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-bold flex items-center gap-1"
                              >
                                <ExternalLink size={13} />
                                <span>Chat</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleEditNoteTrigger(note)}
                              className="p-1.5 text-slate-400 hover:text-slate-200"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-xs font-bold uppercase tracking-wider border-b ${
                      theme === 'dark' ? 'border-white/5 text-slate-400 bg-white/[0.01]' : 'border-slate-100 text-slate-500 bg-slate-50/50'
                    }`}>
                      <th className="py-4 px-4 text-center w-16">ক্রমিক নং</th>
                      <th className="py-4 px-5">Chat Title</th>
                      <th className="py-4 px-4">AI Provider</th>
                      <th className="py-4 px-4">Chapter</th>
                      <th className="py-4 px-4">Type</th>
                      <th className="py-4 px-4">Gmail Account</th>
                      <th className="py-4 px-4">Question Topic</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                    {filteredNotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                          <HelpCircle className="mx-auto text-slate-500 mb-3" size={32} />
                          No educational notes saved for this course yet or matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredNotes.map((note) => {
                        const courseNotes = selectedCourse 
                          ? notes.filter(n => n.courseId === selectedCourse.id)
                          : notes;
                        const serialIndex = courseNotes.findIndex(n => n.id === note.id) + 1;
                        const serialFormatted = serialIndex < 10 ? `0${serialIndex}` : `${serialIndex}`;

                        return (
                          <tr 
                            key={note.id}
                            className={`text-xs transition-all hover:bg-slate-500/5 ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            <td className="py-4 px-4 text-center font-bold">
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono font-extrabold border ${
                                theme === 'dark'
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`} title={`Note #${serialIndex}`}>
                                #{serialFormatted}
                              </span>
                            </td>
                            <td className="py-4 px-5 max-w-[220px] font-bold text-sm">
                              <div className="group/title relative flex items-center justify-between gap-1.5 max-w-full">
                                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                  <span className={`truncate ${
                                    theme === 'dark' ? 'text-slate-100' : 'text-slate-800'
                                  }`}>
                                    {note.chatTitle}
                                  </span>
                                  <span className={`text-[11px] font-mono font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                                    theme === 'dark'
                                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`} title={`${note.questionCount || 1}টি প্রশ্ন`}>
                                    ({note.questionCount || 1})
                                  </span>
                                </div>

                                {/* Hover Tooltip Pop-Up in Bengali */}
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/title:flex flex-col z-30 pointer-events-none transition-all duration-200">
                                  <div className={`px-3 py-1.5 rounded-xl shadow-2xl text-xs font-bold border flex items-center gap-1.5 whitespace-nowrap ${
                                    theme === 'dark' 
                                      ? 'bg-slate-900 border-indigo-500/40 text-slate-100 shadow-indigo-500/20' 
                                      : 'bg-white border-indigo-200 text-indigo-950 shadow-indigo-200/50'
                                  }`}>
                                    <HelpCircle size={14} className="text-indigo-500 shrink-0" />
                                    <span>এখানে {note.questionCount || 1}টি প্রশ্ন আছে</span>
                                  </div>
                                  <div className={`w-2.5 h-2.5 rotate-45 border-r border-b ml-5 -mt-1.5 ${
                                    theme === 'dark' ? 'bg-slate-900 border-indigo-500/40' : 'bg-white border-indigo-200'
                                  }`}></div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyChatTitle(note.chatTitle, note.id);
                                  }}
                                  className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 hover:bg-slate-500/10 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded cursor-pointer ml-1 shrink-0"
                                  title="Copy Chat Title"
                                >
                                  {copiedId === note.id ? (
                                    <Check size={12} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-4 max-w-[120px] truncate">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border truncate inline-block max-w-full ${
                                note.aiProvider === 'ChatGPT' ? (
                                  theme === 'dark' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                ) : note.aiProvider === 'Gemini' ? (
                                  theme === 'dark' 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                ) : note.aiProvider === 'Google AI Studio' ? (
                                  theme === 'dark' 
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                ) : note.aiProvider === 'Claude' ? (
                                  theme === 'dark' 
                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                ) : (
                                  theme === 'dark' 
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                )
                              }`} title={note.aiProvider}>
                                {note.aiProvider}
                              </span>
                            </td>
                            <td className="py-4 px-4 max-w-[120px] truncate">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[10px] truncate inline-block max-w-full ${
                                theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200/50'
                              }`} title={note.chapter}>
                                {note.chapter}
                              </span>
                            </td>
                            <td className="py-4 px-4 max-w-[120px]">
                              <div className="flex gap-1 flex-wrap max-w-full">
                                {note.categories.map((cat, i) => (
                                  <span 
                                    key={i} 
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border truncate inline-block ${
                                      theme === 'dark' 
                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' 
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    }`}
                                    title={cat}
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className={`py-4 px-4 font-mono max-w-[140px] truncate ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              <span className="flex items-center gap-1 truncate" title={note.gmail}>
                                <Mail size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="truncate">{note.gmail}</span>
                              </span>
                            </td>
                            <td className={`py-4 px-4 max-w-xs font-medium ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              <div className="flex items-center gap-2">
                                {((note.questionImages && note.questionImages.length > 0) || note.questionImageUrl) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const allImages = note.questionImages && note.questionImages.length > 0 ? note.questionImages : (note.questionImageUrl ? [note.questionImageUrl] : []);
                                      openLightbox(allImages, 0, note.chatTitle);
                                    }}
                                    className="group/img relative shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-indigo-500/30 hover:border-indigo-500 transition-all hover:scale-110 shadow-xs cursor-pointer bg-black/30"
                                    title="বড় করে সমীকরণের ছবি দেখুন (Gallery)"
                                  >
                                    <img 
                                      src={note.questionImages?.[0] || note.questionImageUrl} 
                                      alt="Math equation"
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                                      <Eye size={11} />
                                    </div>
                                  </button>
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="truncate block" title={note.question}>
                                    {note.question}
                                  </span>
                                  {note.questionImages && note.questionImages.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const allImages = note.questionImages && note.questionImages.length > 0 ? note.questionImages : (note.questionImageUrl ? [note.questionImageUrl] : []);
                                        openLightbox(allImages, 0, note.chatTitle);
                                      }}
                                      className="text-[10px] text-indigo-500 hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold block cursor-pointer hover:underline text-left"
                                      title="সবগুলো সমীকরণ ও ছবি দেখুন"
                                    >
                                      +{note.questionImages.length - 1} আরও ছবি (সব দেখুন)
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setActiveViewNote(note);
                                    setIsViewNoteModalOpen(true);
                                  }}
                                  className={`p-1.5 rounded transition-all hover:bg-slate-500/10 ${
                                    theme === 'dark' ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                  title="View Details"
                                >
                                  <FileText size={14} />
                                </button>
                                
                                {note.chatLink && (
                                  <a
                                    href={note.chatLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-all"
                                    title="Open AI Chat Link"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}

                                <button
                                  onClick={() => handleEditNoteTrigger(note)}
                                  className={`p-1.5 rounded transition-all hover:bg-slate-500/10 ${
                                    theme === 'dark' ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                  title="Edit Note"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-all"
                                  title="Delete Note"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CREATE/EDIT COURSE MODAL ==================== */}
      <AnimatePresence>
        {isCourseModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-start justify-center pt-14 sm:pt-8 pb-12">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-2xl border p-4 sm:p-6 my-auto shadow-2xl relative overflow-hidden ${
                theme === 'dark' ? 'bg-[#111827] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setIsCourseModalOpen(false);
                }}
                className={`absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-500/10 transition-all ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="text-indigo-500" size={20} />
                <span>{editingCourse ? 'Edit Course Details' : 'Add New Course'}</span>
              </h2>

              <form onSubmit={handleCourseSubmit} className="space-y-4">
                {/* Course Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Course Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics, Machine Learning"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-500/40 dark:placeholder:text-slate-400/25 ${
                      theme === 'dark' 
                        ? 'bg-black/20 border-white/5 text-slate-100 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                    }`}
                  />
                </div>

                {/* Course Year */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Year / Academic Term
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddTabModalOpen(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add New Tab</span>
                    </button>
                  </div>

                  <div className="relative">
                    <select
                      required
                      value={courseYear}
                      onChange={(e) => setCourseYear(e.target.value)}
                      className={`w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-[#1e293b] border-white/10 text-slate-100 focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    >
                      <option value="" disabled>Select Year / Term...</option>
                      {yearTabs.map((yt) => (
                        <option key={yt} value={yt}>{yt}</option>
                      ))}
                      {/* Preserve existing custom string if not in yearTabs */}
                      {courseYear && !yearTabs.includes(courseYear) && (
                        <option value={courseYear}>{courseYear}</option>
                      )}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Course Code & Credit (Side-by-side) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Course Code */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Course Code <span className="text-[10px] font-normal lowercase text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PHA-2101, CSE-101"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-500/40 dark:placeholder:text-slate-400/25 ${
                        theme === 'dark' 
                          ? 'bg-black/20 border-white/5 text-slate-100 focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  {/* Course Credit */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Course Credit <span className="text-[10px] font-normal lowercase text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3, 4.0, 1.5"
                      value={courseCredit}
                      onChange={(e) => setCourseCredit(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-500/40 dark:placeholder:text-slate-400/25 ${
                        theme === 'dark' 
                          ? 'bg-black/20 border-white/5 text-slate-100 focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Additional Course Resource Links */}
                <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/5' 
                    : 'bg-slate-50/60 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Globe size={14} className="text-indigo-400" />
                      <span>Additional Course Resource Links</span>
                      <span className="text-[10px] text-slate-500 font-normal lowercase">(optional)</span>
                    </label>
                    {courseAdditionalLinks.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {courseAdditionalLinks.length} {courseAdditionalLinks.length === 1 ? 'Link' : 'Links'} Added
                      </span>
                    )}
                  </div>

                  {/* Inputs to add new link */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Link Title (e.g. Syllabus Drive, Reference Book, Lecture Videos)"
                      value={newCourseLinkTitle}
                      onChange={(e) => setNewCourseLinkTitle(e.target.value)}
                      className={`sm:col-span-5 px-3.5 py-2 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    />
                    <input
                      type="url"
                      placeholder="Link URL (e.g. https://...)"
                      value={newCourseLinkUrl}
                      onChange={(e) => setNewCourseLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCourseAdditionalLink();
                        }
                      }}
                      className={`sm:col-span-5 px-3.5 py-2 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCourseAdditionalLink}
                      className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-600/15 cursor-pointer active:scale-95"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Display added links */}
                  {courseAdditionalLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                      {courseAdditionalLinks.map((link, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            theme === 'dark'
                              ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          }`}
                        >
                          <Globe size={12} className="text-indigo-500 shrink-0" />
                          <span className="font-bold truncate max-w-[160px]" title={link.title}>{link.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCourseAdditionalLink(idx)}
                            className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                            title="Remove link"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourse(null);
                      setIsCourseModalOpen(false);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10"
                  >
                    {editingCourse ? 'Save Changes' : 'Create Course'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CREATE/EDIT NOTE FORM MODAL ==================== */}
      <AnimatePresence>
        {isNoteModalOpen && selectedCourse && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 overflow-y-auto p-2 sm:p-4 md:p-6 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                theme === 'dark' ? 'bg-[#0f172a] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <Brain size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm sm:text-base md:text-lg font-bold leading-tight truncate">
                      {editingNote ? 'Edit AI Chat Note' : 'Add New Study Note'}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium shrink-0">Course:</span>
                      <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 truncate">
                        {selectedCourse.name}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingNote(null);
                    setIsNoteModalOpen(false);
                  }}
                  className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                    theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleNoteSubmit} className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                
                {/* 1. Basic Info Section */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Chat Title */}
                    <div className="space-y-1">
                      <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Brain size={13} className="text-indigo-400 shrink-0" />
                        <span>AI Chat Title *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Legendre Polynomial Orthogonality"
                        value={noteChatTitle}
                        onChange={(e) => setNoteChatTitle(e.target.value)}
                        className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/40 font-medium ${
                          theme === 'dark' 
                            ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                        }`}
                      />
                    </div>

                    {/* AI Provider */}
                    <div className="space-y-1">
                      <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-400 shrink-0" />
                        <span>AI Provider *</span>
                      </label>
                      <div className="relative">
                        <select
                          value={noteAiProvider}
                          onChange={(e) => setNoteAiProvider(e.target.value)}
                          className={`w-full appearance-none pl-3 pr-9 py-2 sm:pl-3.5 sm:pr-10 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium cursor-pointer ${
                            theme === 'dark' 
                              ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                          }`}
                        >
                          {AI_PROVIDERS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Gmail Account */}
                    <div className="space-y-1">
                      <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Mail size={13} className="text-indigo-400 shrink-0" />
                        <span>Gmail Account Used *</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. user@gmail.com"
                        value={noteGmail}
                        onChange={(e) => setNoteGmail(e.target.value)}
                        className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/40 font-medium ${
                          theme === 'dark' 
                            ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                        }`}
                      />
                    </div>

                    {/* AI Chat Link */}
                    <div className="space-y-1">
                      <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Globe size={13} className="text-indigo-400 shrink-0" />
                        <span>AI Chat Link <span className="text-[10px] text-slate-500 font-normal lowercase">(optional)</span></span>
                      </label>
                      <input
                        type="url"
                        placeholder="e.g. https://chatgpt.com/share/..."
                        value={noteChatLink}
                        onChange={(e) => setNoteChatLink(e.target.value)}
                        className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/40 font-medium ${
                          theme === 'dark' 
                            ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Chapter & Category Classification */}
                <div className={`p-3 sm:p-4 rounded-xl border transition-all space-y-3 sm:space-y-4 ${
                  theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/70 border-slate-200/80'
                }`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Chapter Select */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Layers size={13} className="text-indigo-400 shrink-0" />
                          <span>Select Chapter / অধ্যায়</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setTempChapters([...(selectedCourse.chapters || [])]);
                            setIsChaptersModalOpen(true);
                          }}
                          className="text-[10px] sm:text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/20 transition-all shrink-0 cursor-pointer"
                        >
                          <Settings size={11} />
                          <span>অধ্যায় এডিট</span>
                        </button>
                      </div>

                      <div className="relative">
                        <select
                          value={noteChapter}
                          onChange={(e) => setNoteChapter(e.target.value)}
                          className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer appearance-none ${
                            theme === 'dark' 
                              ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500' 
                              : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 shadow-xs'
                          }`}
                        >
                          {(selectedCourse.chapters || []).length === 0 ? (
                            <option value="General">General (No chapters yet)</option>
                          ) : (
                            (selectedCourse.chapters || []).map((ch, i) => (
                              <option key={i} value={ch}>{ch}</option>
                            ))
                          )}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Content Tags (No truncation on mobile, wraps naturally) */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Activity size={13} className="text-indigo-400 shrink-0" />
                        <span>Content Tags</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {CATEGORY_OPTIONS.map((cat) => {
                          const isSelected = noteCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategoryCheckboxChange(cat)}
                              className={`py-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                isSelected
                                  ? theme === 'dark' 
                                    ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 shadow-xs'
                                    : 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-xs'
                                  : theme === 'dark'
                                    ? 'bg-black/20 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : theme === 'dark' ? 'border-white/20' : 'border-slate-300'
                              }`}>
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Question Details & Count */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText size={13} className="text-indigo-400 shrink-0" />
                      <span>Question / Topic Details</span>
                    </label>

                    {/* Question Count */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                      <span className="text-[10px] sm:text-xs">প্রশ্নের সংখ্যা:</span>
                      <div className="flex items-center border rounded-lg px-2 py-0.5 gap-1 bg-black/10 dark:bg-black/30 border-slate-300 dark:border-white/10">
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={noteQuestionCount}
                          onChange={(e) => setNoteQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-8 bg-transparent text-center text-xs font-bold focus:outline-none text-indigo-600 dark:text-indigo-400"
                        />
                        <span className="text-[10px] text-slate-400">টি</span>
                      </div>
                    </div>
                  </div>

                  {noteQuestionImages.length > 0 && (
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span>✓ সমীকরণ/ছবির ফাইল যুক্ত রয়েছে (টেক্সট ফাঁকা রাখলেও চলবে)</span>
                    </div>
                  )}

                  <textarea
                    required={noteQuestionImages.length === 0}
                    rows={3}
                    placeholder="প্রশ্নের বিস্তারিত বা বিবরণ লিখুন... সমীকরণ পেস্ট করতে নিচের বক্সে ছবি দিন বা পেস্ট করুন"
                    value={noteQuestion}
                    onChange={(e) => setNoteQuestion(e.target.value)}
                    className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/40 font-medium leading-relaxed ${
                      theme === 'dark' 
                        ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* 4. Math Equation & Screenshots (Upload, Drag-Drop, Ctrl+V) */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleNoteImageDrop}
                  className={`p-3 sm:p-4 rounded-xl border transition-all space-y-2.5 ${
                    theme === 'dark' 
                      ? 'bg-indigo-950/20 border-indigo-500/20' 
                      : 'bg-indigo-50/40 border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ImageIcon size={14} className="text-indigo-400 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-200 truncate">
                        সমীকরণ ও প্রশ্নের ছবি (Math Images)
                      </span>
                    </div>

                    {noteQuestionImages.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        {noteQuestionImages.length}টি ছবি যুক্ত
                      </span>
                    )}
                  </div>

                  {/* Responsive Hint */}
                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-300/90 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
                    <Sparkles size={12} className="text-indigo-400 shrink-0" />
                    <span>
                      <span className="hidden sm:inline">💡 যেকোনো স্ক্রিনশট কপি করে সরাসরি <strong>Ctrl + V</strong> চাপলে স্বয়ংক্রিয় যুক্ত হবে।</span>
                      <span className="sm:hidden">💡 গ্যালারি/ক্যামেরা থেকে ছবি সিলেক্ট করুন বা কপি করা ছবি পেস্ট করুন।</span>
                    </span>
                  </div>

                  {/* Upload Trigger */}
                  <div className="flex items-center gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all ${
                      isUploadingNoteImage 
                        ? 'opacity-50 pointer-events-none' 
                        : theme === 'dark'
                          ? 'border-indigo-500/40 hover:border-indigo-400 bg-black/25 hover:bg-black/40 text-slate-200'
                          : 'border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 text-slate-700'
                    }`}>
                      <Upload size={15} className="text-indigo-400 shrink-0" />
                      <span className="text-xs font-semibold">
                        ছবি আপলোড করতে ট্যাপ করুন
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleNoteImageFileInput}
                        className="hidden"
                      />
                    </label>

                    {isUploadingNoteImage && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 shrink-0 animate-pulse">
                        <Activity className="animate-spin" size={14} />
                        <span>আপলোড...</span>
                      </div>
                    )}
                  </div>

                  {/* Attached Images Grid */}
                  {noteQuestionImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                      {noteQuestionImages.map((imgUrl, index) => (
                        <div 
                          key={index}
                          className="relative group rounded-xl overflow-hidden border border-indigo-500/30 aspect-video bg-black/50 shadow-xs"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Math Screenshot ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          
                          <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                            #{index + 1}
                          </span>

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                openLightbox(noteQuestionImages, index, 'সমীকরণ ও প্রশ্ন প্রিভিউ');
                              }}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                              title="Zoom"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveNoteImage(index)}
                              className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Mobile-accessible delete button in corner */}
                          <button
                            type="button"
                            onClick={() => handleRemoveNoteImage(index)}
                            className="sm:hidden absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 hover:text-white"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Additional Resource Links */}
                <div className={`p-3 sm:p-4 rounded-xl border space-y-2.5 transition-all ${
                  theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/70 border-slate-200/80'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Globe size={13} className="text-indigo-400 shrink-0" />
                      <span>Additional Resource Links <span className="text-[10px] text-slate-500 font-normal lowercase">(ঐচ্ছিক)</span></span>
                    </label>
                    {noteAdditionalLinks.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {noteAdditionalLinks.length} Links
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Title (e.g. Slides, Solution Drive)"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className={`sm:w-2/5 px-3 py-2 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    />
                    <input
                      type="url"
                      placeholder="URL (e.g. https://...)"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAdditionalLink();
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/10 text-slate-100 focus:border-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddAdditionalLink}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shrink-0"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>

                  {noteAdditionalLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {noteAdditionalLinks.map((link, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            theme === 'dark'
                              ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          }`}
                        >
                          <Globe size={11} className="text-indigo-400 shrink-0" />
                          <span className="font-bold truncate max-w-[140px]" title={link.title}>{link.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalLink(idx)}
                            className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sticky Action Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNote(null);
                      setIsNoteModalOpen(false);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 sm:px-6 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer"
                  >
                    {editingNote ? 'Save Updates' : 'Add Note'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CHAPTERS MANAGER MODAL ==================== */}
      <AnimatePresence>
        {isChaptersModalOpen && selectedCourse && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-start justify-center pt-14 sm:pt-8 pb-12">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl border p-4 sm:p-6 my-auto shadow-2xl relative ${
                theme === 'dark' ? 'bg-[#111827] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsChaptersModalOpen(false)}
                className={`absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-500/10 transition-all ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={18} />
              </button>

              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Settings className="text-indigo-500" size={18} />
                <span>Chapter/Oddai Settings</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Define the chapters or topics for <b>{selectedCourse.name}</b>. You can then pick these in your notes form.
              </p>

              {/* Add Chapter Inline */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Chapter 3: Integration"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTempChapter(); }}
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                    theme === 'dark' ? 'bg-black/20 border-white/5 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddTempChapter}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 rounded-xl transition-all"
                >
                  Add
                </button>
              </div>

              {/* Chapters List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto p-1 mb-4 border rounded-xl dark:border-white/5 bg-black/5 dark:bg-black/10">
                {tempChapters.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400 italic">No chapters defined. Add one above.</p>
                ) : (
                  tempChapters.map((chap) => (
                    <div
                      key={chap}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                        theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50 border shadow-sm'
                      }`}
                    >
                      <span>{chap}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTempChapter(chap)}
                        className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all"
                        title="Remove chapter"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Save / Cancel */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsChaptersModalOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChapters}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                >
                  Save Chapters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== VIEW NOTE DETAILS MODAL ==================== */}
      <AnimatePresence>
        {isViewNoteModalOpen && activeViewNote && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                theme === 'dark' ? 'bg-[#0f172a] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    activeViewNote.aiProvider === 'ChatGPT' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                    activeViewNote.aiProvider === 'Gemini' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                    activeViewNote.aiProvider === 'Google AI Studio' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' :
                    activeViewNote.aiProvider === 'Claude' ? 'bg-amber-500/10 text-amber-700 dark:text-orange-400 border border-amber-500/20' :
                    'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  }`}>
                    {activeViewNote.aiProvider}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                    theme === 'dark' ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {activeViewNote.chapter}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {activeViewNote.questionCount || 1}টি প্রশ্ন
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveViewNote(null);
                    setIsViewNoteModalOpen(false);
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
                <div>
                  <h2 className={`text-lg sm:text-xl font-extrabold tracking-tight mb-2 ${
                    theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                  }`}>{activeViewNote.chatTitle}</h2>

                  {/* Categories */}
                  {activeViewNote.categories.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {activeViewNote.categories.map((cat, i) => (
                        <span 
                          key={i} 
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gmail details */}
                <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                  theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}>
                  <Mail size={16} className="text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Associated Account</span>
                    <span className="text-xs font-mono font-semibold truncate block">{activeViewNote.gmail}</span>
                  </div>
                </div>

                {/* Question Area */}
                {activeViewNote.question && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                      <FileText size={13} className="text-indigo-400" />
                      <span>Question Topic & Details</span>
                    </span>
                    <div className={`p-3.5 sm:p-4 rounded-xl border text-sm overflow-y-auto max-h-56 whitespace-pre-wrap leading-relaxed ${
                      theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 font-medium'
                    }`}>
                      {activeViewNote.question}
                    </div>
                  </div>
                )}

                {/* Attached Math & Question Images in View Modal */}
                {((activeViewNote.questionImages && activeViewNote.questionImages.length > 0) || activeViewNote.questionImageUrl) && (
                  <div className={`p-3.5 sm:p-4 rounded-xl border space-y-2.5 ${
                    theme === 'dark' ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-indigo-50/40 border-indigo-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-indigo-400" />
                        <span>সংযুক্ত সমীকরণ ও ছবি ({(activeViewNote.questionImages?.length || (activeViewNote.questionImageUrl ? 1 : 0))})</span>
                      </span>
                      <span className="text-[10px] text-indigo-400 font-semibold">🔍 বড় করে দেখতে ক্লিক করুন</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(activeViewNote.questionImages || (activeViewNote.questionImageUrl ? [activeViewNote.questionImageUrl] : [])).map((imgUrl, i) => (
                        <div 
                          key={i}
                          onClick={() => {
                            const allImages = activeViewNote.questionImages && activeViewNote.questionImages.length > 0 ? activeViewNote.questionImages : (activeViewNote.questionImageUrl ? [activeViewNote.questionImageUrl] : []);
                            openLightbox(allImages, i, activeViewNote.chatTitle);
                          }}
                          className="group relative rounded-xl overflow-hidden border border-indigo-500/30 aspect-video bg-black/50 cursor-pointer shadow-xs hover:border-indigo-400 transition-all hover:scale-102"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Math equation ${i + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                            <ZoomIn size={15} />
                            <span>Zoom</span>
                          </div>
                          <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            #{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Resource Links */}
                {activeViewNote.additionalLinks && activeViewNote.additionalLinks.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Globe size={13} className="text-indigo-400" />
                      <span>Additional Resource Links ({activeViewNote.additionalLinks.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeViewNote.additionalLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-xs group cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                          }`}
                          title={`Open ${link.title}`}
                        >
                          <ExternalLink size={12} className="text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                          <span className="truncate max-w-[180px]">{link.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 shrink-0">
                <span className="text-[11px] text-slate-400">
                  {new Date(activeViewNote.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  {activeViewNote.chatLink && (
                    <a
                      href={activeViewNote.chatLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      <span>Open AI Chat</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewNote(null);
                      setIsViewNoteModalOpen(false);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== ADD YEAR TAB MODAL ==================== */}
      <AnimatePresence>
        {isAddTabModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] overflow-y-auto p-3 sm:p-4 md:p-6 flex items-start justify-center pt-14 sm:pt-8 pb-12">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl border p-4 sm:p-6 my-auto shadow-2xl relative ${
                theme === 'dark' ? 'bg-[#111827] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <button
                onClick={() => setIsAddTabModalOpen(false)}
                className={`absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-500/10 transition-all ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={18} />
              </button>

              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Layers className="text-indigo-500" size={18} />
                <span>Manage Course Year Tabs</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Create new tabs or delete existing ones to organize and filter your courses.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const added = handleAddYearTab(newTabInput);
                  if (added && isCourseModalOpen) {
                    setCourseYear(added);
                  }
                }}
                className="space-y-4 mb-5"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. 5th Year, Masters, Semester 1"
                    value={newTabInput}
                    onChange={(e) => setNewTabInput(e.target.value)}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      theme === 'dark' 
                        ? 'bg-black/20 border-white/5 text-slate-100 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 shrink-0"
                  >
                    Add Tab
                  </button>
                </div>
              </form>

              {/* Existing Tabs List */}
              {yearTabs.length > 0 && (
                <div className="border-t border-slate-500/10 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Existing Tabs ({yearTabs.length})
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                    {yearTabs.map((tab) => (
                      <div 
                        key={tab}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                          theme === 'dark'
                            ? 'bg-white/5 border-white/5 text-slate-200'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{tab}</span>
                        <button
                          type="button"
                          onClick={() => setTabToDeleteConfirm(tab)}
                          className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                          title={`Delete tab ${tab}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-500/10 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddTabModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== VIEW COURSE RESOURCES MODAL ==================== */}
      <AnimatePresence>
        {activeViewCourseResources && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] overflow-y-auto p-3 sm:p-4 md:p-6 flex items-start justify-center pt-14 sm:pt-8 pb-12">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-2xl border p-4 sm:p-6 my-auto shadow-2xl relative overflow-hidden ${
                theme === 'dark' ? 'bg-[#111827] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveViewCourseResources(null)}
                className={`absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-500/10 transition-all ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={18} />
              </button>

              {/* Course Header Banner */}
              <div className="flex items-start gap-4 mb-5 pb-4 border-b border-slate-200/50 dark:border-white/5 pr-8">
                {activeViewCourseResources.imageUrl && (
                  <img
                    src={activeViewCourseResources.imageUrl}
                    alt={activeViewCourseResources.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200/50 dark:border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                      {activeViewCourseResources.year}
                    </span>
                    {activeViewCourseResources.code && (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase tracking-wider">
                        {activeViewCourseResources.code}
                      </span>
                    )}
                    {activeViewCourseResources.credit && (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {activeViewCourseResources.credit.toLowerCase().includes('credit') ? activeViewCourseResources.credit : `${activeViewCourseResources.credit} Credits`}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold truncate text-slate-900 dark:text-slate-100">
                    {activeViewCourseResources.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Course Resources & Reference Links
                  </p>
                </div>
              </div>

              {/* Resource Links Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Globe size={14} />
                    <span>Additional Course Resources</span>
                  </h4>
                  {activeViewCourseResources.additionalLinks && activeViewCourseResources.additionalLinks.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {activeViewCourseResources.additionalLinks.length} {activeViewCourseResources.additionalLinks.length === 1 ? 'Link' : 'Links'}
                    </span>
                  )}
                </div>

                {!activeViewCourseResources.additionalLinks || activeViewCourseResources.additionalLinks.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl border ${
                    theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <Globe className="mx-auto text-slate-400/50 mb-2" size={32} />
                    <p className="text-xs text-slate-400 font-medium mb-3">
                      No additional resource links added for this course yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const courseToEdit = activeViewCourseResources;
                        setActiveViewCourseResources(null);
                        openCourseModal(courseToEdit);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Add Resource Links Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {activeViewCourseResources.additionalLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 transition-all group ${
                          theme === 'dark'
                            ? 'bg-indigo-950/20 border-indigo-500/20 hover:bg-indigo-900/30 hover:border-indigo-500/50 text-indigo-300'
                            : 'bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                            <Globe size={14} />
                          </div>
                          <span className="truncate">{link.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold opacity-80 group-hover:opacity-100 shrink-0">
                          <span>Open Link</span>
                          <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-200/50 dark:border-white/5 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const courseToEdit = activeViewCourseResources;
                    setActiveViewCourseResources(null);
                    openCourseModal(courseToEdit);
                  }}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Edit size={12} />
                  <span>Edit Course Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewCourseResources(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Tab Confirmation Modal */}
      <AnimatePresence>
        {tabToDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] overflow-y-auto p-3 sm:p-4 md:p-6 flex items-start justify-center pt-14 sm:pt-8 pb-12">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl border p-4 sm:p-6 my-auto shadow-2xl relative ${
                theme === 'dark' ? 'bg-[#111827] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-3 text-red-500">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={20} />
                </div>
                <h4 className="text-base font-bold">Delete Tab?</h4>
              </div>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Are you sure you want to delete the tab <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>"{tabToDeleteConfirm}"</strong>?
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTabToDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-500/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAndDeleteYearTab}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20 cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MATH EQUATION & IMAGE LIGHTBOX VIEWER WITH PINCH-ZOOM & NAVIGATION ==================== */}
      <AnimatePresence>
        {lightboxImages.length > 0 && lightboxImages[lightboxIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col items-center justify-between p-1.5 sm:p-4 select-none touch-none"
          >
            {/* Top Compact Toolbar */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl flex items-center justify-between gap-1.5 sm:gap-4 py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-black/80 border border-white/15 text-white shadow-2xl z-20 backdrop-blur-xl shrink-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                <div className="p-1 sm:p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                  <ImageIcon size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold truncate text-slate-100">
                    {lightboxImageTitle || 'সমীকরণ ও প্রশ্নের ছবি'}
                  </h4>
                  {lightboxImages.length > 1 && (
                    <span className="text-[9px] sm:text-[10px] text-indigo-400 font-mono font-bold block leading-none mt-0.5">
                      ছবি {lightboxIndex + 1} / {lightboxImages.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Zoom and Action Controls */}
              <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut size={14} className="sm:w-4 sm:h-4" />
                </button>

                <span className="text-[10px] sm:text-xs font-mono font-bold px-1 sm:px-2 py-0.5 rounded bg-white/10 text-indigo-300 min-w-[34px] sm:min-w-[46px] text-center">
                  {Math.round(lightboxZoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setLightboxZoom(prev => Math.min(4, prev + 0.25))}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn size={14} className="sm:w-4 sm:h-4" />
                </button>

                {(lightboxZoom !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxZoom(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
                    title="Reset Zoom (0 / R)"
                  >
                    Reset
                  </button>
                )}

                <a
                  href={lightboxImages[lightboxIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer hidden xs:flex items-center"
                  title="নতুন ট্যাবে খুলুন"
                >
                  <ExternalLink size={14} className="sm:w-4 sm:h-4" />
                </a>

                <button
                  type="button"
                  onClick={closeLightbox}
                  className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-red-500 text-white transition-colors cursor-pointer ml-0.5 sm:ml-1"
                  title="বন্ধ করুন (Esc)"
                >
                  <X size={15} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Main Stage with Navigation Arrows and Pinch/Zoom/Pan Image */}
            <div 
              className="relative flex-1 w-full max-w-6xl flex items-center justify-center overflow-hidden my-1 sm:my-2 cursor-grab active:cursor-grabbing"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closeLightbox();
                }
              }}
              onWheel={(e) => {
                e.stopPropagation();
                const delta = e.deltaY < 0 ? 0.2 : -0.2;
                setLightboxZoom(prev => Math.min(4, Math.max(0.5, prev + delta)));
              }}
              onMouseDown={(e) => {
                if (lightboxZoom > 1) {
                  isDraggingRef.current = true;
                  dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
                }
              }}
              onMouseMove={(e) => {
                if (isDraggingRef.current && lightboxZoom > 1) {
                  setPanOffset({
                    x: e.clientX - dragStartRef.current.x,
                    y: e.clientY - dragStartRef.current.y
                  });
                }
              }}
              onMouseUp={() => {
                isDraggingRef.current = false;
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  // Two-finger pinch gesture
                  const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  touchStartDistRef.current = dist;
                  touchStartZoomRef.current = lightboxZoom;
                } else if (e.touches.length === 1) {
                  touchStartDistRef.current = null;
                  touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                  dragStartRef.current = { x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y };

                  // Detect double tap (< 300ms) to toggle zoom
                  const now = Date.now();
                  if (now - lastTapTimeRef.current < 300) {
                    if (lightboxZoom > 1.1) {
                      setLightboxZoom(1);
                      setPanOffset({ x: 0, y: 0 });
                    } else {
                      setLightboxZoom(2.2);
                    }
                  }
                  lastTapTimeRef.current = now;
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && touchStartDistRef.current) {
                  const currentDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  const scaleFactor = currentDist / touchStartDistRef.current;
                  const newZoom = Math.min(4, Math.max(0.5, touchStartZoomRef.current * scaleFactor));
                  setLightboxZoom(newZoom);
                } else if (e.touches.length === 1 && lightboxZoom > 1) {
                  const newX = e.touches[0].clientX - dragStartRef.current.x;
                  const newY = e.touches[0].clientY - dragStartRef.current.y;
                  setPanOffset({ x: newX, y: newY });
                }
              }}
              onTouchEnd={(e) => {
                if (e.touches.length === 0) {
                  touchStartDistRef.current = null;
                  if (lightboxZoom <= 1.1 && touchStartPosRef.current && e.changedTouches[0]) {
                    const deltaX = e.changedTouches[0].clientX - touchStartPosRef.current.x;
                    const deltaY = e.changedTouches[0].clientY - touchStartPosRef.current.y;
                    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                      if (deltaX < 0) {
                        handleNextLightboxImage();
                      } else {
                        handlePrevLightboxImage();
                      }
                    }
                  }
                }
              }}
            >
              {/* Previous Image Navigation Arrow (Compact sleek size) */}
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevLightboxImage();
                  }}
                  className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-indigo-600/90 text-white/90 hover:text-white backdrop-blur-md border border-white/15 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                  title="আগের ছবি (Left Arrow)"
                >
                  <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
                </button>
              )}

              {/* Next Image Navigation Arrow (Compact sleek size) */}
              {lightboxImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextLightboxImage();
                  }}
                  className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-indigo-600/90 text-white/90 hover:text-white backdrop-blur-md border border-white/15 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                  title="পরের ছবি (Right Arrow)"
                >
                  <ChevronRight size={16} className="sm:w-5 sm:h-5" />
                </button>
              )}

              {/* Rendered Image with dynamic CSS transform & pan */}
              <div 
                className="flex items-center justify-center transition-transform duration-100 will-change-transform"
                style={{ 
                  transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${lightboxZoom})`,
                  transformOrigin: 'center center' 
                }}
              >
                <img 
                  src={lightboxImages[lightboxIndex]} 
                  alt={`Math Equation ${lightboxIndex + 1}`}
                  className="max-h-[80vh] sm:max-h-[76vh] max-w-[96vw] sm:max-w-[90vw] object-contain rounded-lg sm:rounded-xl shadow-2xl border border-white/10 bg-slate-950 pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Bottom Gallery Thumbnail Strip (If multiple images) */}
            {lightboxImages.length > 1 && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl flex flex-col items-center z-20 shrink-0 pb-0.5"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-black/80 border border-white/10 backdrop-blur-xl max-w-full overflow-x-auto">
                  {lightboxImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxZoom(1);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className={`relative shrink-0 w-10 sm:w-14 h-7 sm:h-10 rounded-md sm:rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        lightboxIndex === idx 
                          ? 'border-indigo-400 scale-105 shadow-md shadow-indigo-500/40' 
                          : 'border-white/20 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`Thumb ${idx + 1}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 bg-black/80 text-[7px] sm:text-[8px] font-bold text-white px-0.5 sm:px-1 rounded-tl leading-tight">
                        #{idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
