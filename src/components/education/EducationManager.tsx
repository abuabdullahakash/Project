import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, BookOpen, Plus, Search, Filter, Calendar, Image as ImageIcon, 
  Clock, Settings, Trash2, Edit, ExternalLink, FileText, Check, ChevronLeft, ChevronRight,
  Brain, Timer, Sparkles, Mail, Layers, Activity, ChevronDown, CheckCircle, 
  X, Play, Pause, RotateCcw, Flame, Trophy, AlertTriangle, HelpCircle, 
  ArrowRight, Globe, Info, Upload, Copy, Eye
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

    if (!noteChatTitle.trim() || !noteQuestion.trim() || !noteGmail.trim()) {
      toast.error('Please fill in Chat Title, Question/Math Topic, and Gmail Account');
      return;
    }

    if (noteCategories.length === 0) {
      toast.error('Please select at least one type (Suggestions, Notes, or Syllabus)');
      return;
    }

    const noteData = {
      courseId: selectedCourse.id,
      userId: auth.currentUser.uid,
      chatTitle: noteChatTitle.trim(),
      categories: noteCategories,
      chapter: noteChapter || 'General',
      question: noteQuestion.trim(),
      questionCount: Number(noteQuestionCount) || 1,
      gmail: noteGmail.trim(),
      aiProvider: noteAiProvider,
      chatLink: noteChatLink.trim() || '',
      additionalLinks: noteAdditionalLinks,
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
    <div className={`p-6 min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#f8fafc] text-slate-800'
    }`} id="educational-workspace-container">
      
      {/* Header with Motivation Section */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        
        {/* Welcome & Motivational Quote */}
        <div className={`flex-1 p-6 rounded-2xl border flex flex-col justify-between transition-all ${
          theme === 'dark' 
            ? 'bg-[#111827] border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <GraduationCap size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">AI Educational Workspace</h1>
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
                className="mt-4"
              >
                <p className={`text-lg italic font-medium leading-relaxed font-serif ${
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

          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500 animate-pulse" size={20} />
              <div>
                <span className="text-xs block text-slate-400">Current Streak</span>
                <span className={`font-bold text-sm ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{streakCount} Days Focused</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              <div>
                <span className="text-xs block text-slate-400">Notes Logged</span>
                <span className={`font-bold text-sm ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{notes.length} Sessions</span>
              </div>
            </div>
            <div className="ml-auto">
              <button 
                onClick={() => setStreakCount(prev => prev + 1)}
                className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold px-3 py-1.5 rounded-full transition-all border border-indigo-500/20"
              >
                + Complete Study
              </button>
            </div>
          </div>
        </div>

        {/* Elegant Pomodoro Focus Timer Widget */}
        <div className={`w-full lg:w-80 p-6 rounded-2xl border flex flex-col justify-between transition-all ${
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
      <div className={`p-4 rounded-xl border mb-6 flex flex-col md:flex-row gap-4 items-center justify-between transition-all ${
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

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          {/* Dynamic Filters shown only in detailed course page or global notes lookup */}
          {selectedCourse && (
            <>
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Chapter:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                    theme === 'dark' ? 'bg-[#1e293b] border-white/5 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="all">All Chapters</option>
                  {(selectedCourse.chapters || []).map((ch, i) => (
                    <option key={i} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">AI Provider:</span>
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                    theme === 'dark' ? 'bg-[#1e293b] border-white/5 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="all">All Providers</option>
                  {AI_PROVIDERS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {!selectedCourse && (
            <button
              onClick={() => openCourseModal()}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/10 hover:-translate-y-0.5"
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
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSelectedCourse(null);
                      setFilterCategory('all');
                      setFilterProvider('all');
                    }}
                    className={`p-2.5 rounded-xl border transition-all ${
                      theme === 'dark' 
                        ? 'border-white/5 bg-white/5 hover:bg-white/10 text-slate-200' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
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
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold tracking-tight">{selectedCourse.name}</h2>
                      {selectedCourse.credit && (
                        <span className="text-xs bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-400 font-bold px-2.5 py-1 rounded-full border border-indigo-500/25 whitespace-nowrap mt-1">
                          {selectedCourse.credit.toLowerCase().includes('credit') ? selectedCourse.credit : `${selectedCourse.credit} Credits`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={openChaptersManager}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      theme === 'dark' 
                        ? 'border-white/5 bg-white/5 hover:bg-white/10 text-slate-200' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Settings size={14} className="text-slate-400" />
                    <span>Manage Chapters</span>
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
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/10 hover:-translate-y-0.5"
                  >
                    <Plus size={14} /> Add New Note
                  </button>
                </div>
              </div>
            </div>

            {/* AI Notes Table */}
            <div className={`border rounded-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#111827] border-white/5 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="p-4 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <span>Notes List ({filteredNotes.length})</span>
                </span>
                
                {searchQuery && (
                  <span className="text-[10px] bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded font-medium">
                    Filtered by: "{searchQuery}"
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
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
                            <td className={`py-4 px-4 max-w-xs truncate font-medium ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`} title={note.question}>
                              {note.question}
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-2xl border p-6 overflow-hidden shadow-2xl relative ${
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-2xl rounded-2xl border p-6 my-8 shadow-2xl relative ${
                theme === 'dark' ? 'bg-[#111827] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setEditingNote(null);
                  setIsNoteModalOpen(false);
                }}
                className={`absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-500/10 transition-all ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-200/50 dark:border-white/5 pb-3">
                <Brain className="text-indigo-500 animate-pulse" size={20} />
                <span>{editingNote ? 'Edit AI Chat Note' : 'Add New Study Note'}</span>
                <span className="text-xs font-normal text-slate-400 block ml-2">
                  (for {selectedCourse.name})
                </span>
              </h2>

              <form onSubmit={handleNoteSubmit} className="space-y-5">
                
                {/* Row 1: Chat Title & AI Provider */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Brain size={13} className="text-indigo-400" />
                      <span>Ai Chat Title</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Calculus Limits"
                      value={noteChatTitle}
                      onChange={(e) => setNoteChatTitle(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/20 dark:placeholder:text-slate-500/15 font-medium ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                          : 'bg-slate-50/50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-400" />
                      <span>AI Provider Selection</span>
                    </label>
                    <div className="relative">
                      <select
                        value={noteAiProvider}
                        onChange={(e) => setNoteAiProvider(e.target.value)}
                        className={`w-full appearance-none pl-4 pr-10 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                        }`}
                      >
                        {AI_PROVIDERS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Row 2: Chapter Selection & settings & Note categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-r from-indigo-950/30 via-slate-900/40 to-indigo-950/20 border-indigo-500/20 shadow-inner' 
                      : 'bg-gradient-to-r from-indigo-50/70 via-slate-50/50 to-indigo-50/40 border-indigo-200/80 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-500 animate-pulse" />
                        <span>SELECT CHAPTER / (অধ্যায়)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTempChapters([...(selectedCourse.chapters || [])]);
                          setIsChaptersModalOpen(true);
                        }}
                        className="text-xs text-white bg-indigo-600 hover:bg-indigo-500 font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                        title="Manage Chapters list"
                      >
                        <Settings size={12} />
                        <span>Add/Edit Chapters</span>
                      </button>
                    </div>

                    <div className="relative">
                      <select
                        value={noteChapter}
                        onChange={(e) => setNoteChapter(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer appearance-none ${
                          theme === 'dark' 
                            ? 'bg-[#111827] border-indigo-500/30 text-slate-100 focus:border-indigo-500' 
                            : 'bg-white border-indigo-200 text-slate-800 focus:border-indigo-500 shadow-sm'
                        }`}
                      >
                        {(selectedCourse.chapters || []).length === 0 ? (
                          <option value="General">General (No chapters created yet)</option>
                        ) : (
                          (selectedCourse.chapters || []).map((ch, i) => (
                            <option key={i} value={ch}>{ch}</option>
                          ))
                        )}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Activity size={13} className="text-indigo-400" />
                      <span>Syllabus / Notes / Suggestions Details</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORY_OPTIONS.map((cat) => {
                        const isSelected = noteCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleCategoryCheckboxChange(cat)}
                            className={`py-3 px-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? theme === 'dark' 
                                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_2px_10px_rgba(99,102,241,0.15)]'
                                  : 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-[0_2px_10px_rgba(99,102,241,0.08)]'
                                : theme === 'dark'
                                  ? 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-300 hover:bg-white/5'
                                  : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : theme === 'dark' ? 'border-white/10' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className="truncate">{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 3: Gmail Account & Chat Link */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Mail size={13} className="text-indigo-400" />
                      <span>Gmail account Used</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. user@gmail.com"
                      value={noteGmail}
                      onChange={(e) => setNoteGmail(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/20 dark:placeholder:text-slate-500/15 font-medium ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                          : 'bg-slate-50/50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Globe size={13} className="text-indigo-400" />
                      <span>AI Chat Link (Optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://chatgpt.com/..."
                      value={noteChatLink}
                      onChange={(e) => setNoteChatLink(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/20 dark:placeholder:text-slate-500/15 font-medium ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                          : 'bg-slate-50/50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Row 4: Question / Math Description & Question Count */}
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-0.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText size={13} className="text-indigo-400" />
                      <span>Question / Solving details</span>
                    </label>

                    {/* Question Count Number Field */}
                    <div className="flex items-center gap-2 bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 px-3 py-1 rounded-xl shrink-0">
                      <HelpCircle size={13} className="text-indigo-500" />
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                        প্রশ্নের সংখ্যা (Count):
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        required
                        value={noteQuestionCount}
                        onChange={(e) => setNoteQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className={`w-16 px-2 py-0.5 rounded-lg border text-xs font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                          theme === 'dark'
                            ? 'bg-black/50 border-indigo-500/40 text-white'
                            : 'bg-white border-indigo-300 text-indigo-950'
                        }`}
                      />
                      <span className="text-[11px] font-bold text-indigo-500">টি</span>
                    </div>
                  </div>

                  <textarea
                    required
                    rows={4}
                    placeholder="Type or paste the question/solving details here..."
                    value={noteQuestion}
                    onChange={(e) => setNoteQuestion(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-400/20 dark:placeholder:text-slate-500/15 font-medium ${
                      theme === 'dark' 
                        ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500 focus:bg-black/40' 
                        : 'bg-slate-50/50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Additional Resource Links Section */}
                <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/5' 
                    : 'bg-slate-50/60 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Globe size={13} className="text-indigo-400" />
                      <span>Additional Resource Links</span>
                      <span className="text-[10px] text-slate-500 font-normal lowercase">(optional)</span>
                    </label>
                    {noteAdditionalLinks.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {noteAdditionalLinks.length} {noteAdditionalLinks.length === 1 ? 'Link' : 'Links'} Added
                      </span>
                    )}
                  </div>

                  {/* Inputs to add new link */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Link Title (e.g. Lecture Slides, Solution Drive)"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className={`sm:col-span-5 px-3.5 py-2 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                        theme === 'dark' 
                          ? 'bg-black/30 border-white/5 text-slate-100 focus:border-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                      }`}
                    />
                    <input
                      type="url"
                      placeholder="Link URL (e.g. https://...)"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAdditionalLink();
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
                      onClick={handleAddAdditionalLink}
                      className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-600/15 cursor-pointer active:scale-95"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Display added links */}
                  {noteAdditionalLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                      {noteAdditionalLinks.map((link, idx) => (
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
                            onClick={() => handleRemoveAdditionalLink(idx)}
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

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNote(null);
                      setIsNoteModalOpen(false);
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-102 active:scale-98 ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-98 hover:scale-102"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl relative ${
                theme === 'dark' ? 'bg-[#111827] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setActiveViewNote(null);
                  setIsViewNoteModalOpen(false);
                }}
                className={`absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-500/10 transition-all ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={18} />
              </button>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeViewNote.aiProvider === 'ChatGPT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    activeViewNote.aiProvider === 'Gemini' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    activeViewNote.aiProvider === 'Google AI Studio' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    activeViewNote.aiProvider === 'Claude' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {activeViewNote.aiProvider}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {activeViewNote.chapter}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    theme === 'dark'
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {activeViewNote.questionCount || 1}টি প্রশ্ন
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">{activeViewNote.chatTitle}</h2>
              </div>

              <div className="space-y-4">
                
                {/* Categories */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type Categories</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {activeViewNote.categories.map((cat, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Gmail details */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl border dark:border-white/5 bg-black/5 dark:bg-black/10">
                  <Mail size={16} className="text-slate-400" />
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Associated Gmail</span>
                    <span className="text-xs font-semibold">{activeViewNote.gmail}</span>
                  </div>
                </div>

                {/* Question Area */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Question Topic & Solutions</span>
                  <div className={`p-4 rounded-xl border text-sm overflow-y-auto max-h-60 whitespace-pre-wrap leading-relaxed ${
                    theme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {activeViewNote.question}
                  </div>
                </div>

                {/* Additional Resource Links (Only titles shown, clicking opens link) */}
                {activeViewNote.additionalLinks && activeViewNote.additionalLinks.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Globe size={12} className="text-indigo-400" />
                      <span>Additional Resource Links ({activeViewNote.additionalLinks.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeViewNote.additionalLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shadow-xs group cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-500/60'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                          }`}
                          title={`Open ${link.title}`}
                        >
                          <ExternalLink size={13} className="text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
                          <span>{link.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer and Links */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-400">
                    Logged: {new Date(activeViewNote.createdAt).toLocaleString()}
                  </span>

                  <div className="flex gap-2">
                    {activeViewNote.chatLink && (
                      <a
                        href={activeViewNote.chatLink}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <ExternalLink size={12} />
                        <span>Open AI Chat</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveViewNote(null);
                        setIsViewNoteModalOpen(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== ADD YEAR TAB MODAL ==================== */}
      <AnimatePresence>
        {isAddTabModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative overflow-hidden ${
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl relative ${
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

    </div>
  );
}
