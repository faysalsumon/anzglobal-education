import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  X, DollarSign, Clock, MapPin, BookOpen, Award, Globe, GitCompare, 
  Search, Building2, GraduationCap, Mail, Plus, Heart, Check, 
  ChevronRight, ArrowRight, Calendar, Users, Briefcase, FileText
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Course } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { PublicLayout } from "@/components/public-layout";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface CourseWithUniversity extends Course {
  university?: {
    id: string;
    name: string;
    logo?: string;
  };
}

// Comparison attribute definition
interface ComparisonAttribute {
  key: string;
  label: string;
  icon: React.ReactNode;
  getValue: (course: CourseWithUniversity) => React.ReactNode;
  category: 'overview' | 'fees' | 'requirements' | 'career';
}

export default function CompareCourses() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const COMPARISON_STORAGE_KEY = 'course_comparisons';
  const FAVORITES_STORAGE_KEY = 'course_favorites';
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Read course IDs from URL query parameter
  const [courseIds, setCourseIds] = useState<string[]>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const coursesParam = urlParams.get('courses');
    if (coursesParam) {
      return coursesParam.split(',').filter(id => id.trim());
    }
    try {
      const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Read favorites from localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  // Fetch all courses
  const { data: allCourses = [], isLoading } = useQuery<CourseWithUniversity[]>({
    queryKey: ["/api/courses"],
  });

  // Filter to only the selected courses
  const courses = useMemo(() => 
    allCourses.filter(c => courseIds.includes(c.id)),
    [allCourses, courseIds]
  );

  // Available courses for adding (not already in comparison)
  const availableCourses = useMemo(() => 
    allCourses.filter(c => 
      !courseIds.includes(c.id) && 
      c.approvalStatus === 'approved' &&
      (searchQuery === "" || 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.university?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.discipline?.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 20),
    [allCourses, courseIds, searchQuery]
  );

  // Add a course to comparison
  const addCourse = (courseId: string) => {
    if (courseIds.length >= 4) {
      toast({
        title: "Maximum reached",
        description: "You can compare up to 4 courses at a time",
        variant: "destructive"
      });
      return;
    }
    const newIds = [...courseIds, courseId];
    setCourseIds(newIds);
    try {
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(newIds));
    } catch {}
    navigate(`/compare-courses?courses=${newIds.join(',')}`);
    setAddCourseDialogOpen(false);
    toast({
      title: "Added",
      description: "Course added to comparison",
    });
  };

  // Remove a course from comparison
  const removeCourse = (courseId: string) => {
    const newIds = courseIds.filter(id => id !== courseId);
    setCourseIds(newIds);
    try {
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(newIds));
    } catch {}
    if (newIds.length > 0) {
      navigate(`/compare-courses?courses=${newIds.join(',')}`);
    } else {
      navigate('/compare-courses');
    }
    toast({
      title: "Removed",
      description: "Course removed from comparison",
    });
  };

  // Toggle favorite
  const toggleFavorite = (courseId: string) => {
    if (favorites.includes(courseId)) {
      setFavorites(favorites.filter(id => id !== courseId));
      toast({
        title: "Removed from favorites",
        description: "Course removed from your favorites",
      });
    } else {
      setFavorites([...favorites, courseId]);
      toast({
        title: "Added to favorites",
        description: "Course saved to your favorites",
      });
    }
  };

  // Define comparison attributes with aligned rows
  const comparisonAttributes: ComparisonAttribute[] = [
    {
      key: 'institution',
      label: 'Institution',
      icon: <Building2 className="h-4 w-4" />,
      getValue: (course) => course.university?.name || '—',
      category: 'overview'
    },
    {
      key: 'level',
      label: 'Course Level',
      icon: <GraduationCap className="h-4 w-4" />,
      getValue: (course) => course.level || '—',
      category: 'overview'
    },
    {
      key: 'discipline',
      label: 'Discipline',
      icon: <BookOpen className="h-4 w-4" />,
      getValue: (course) => course.discipline || '—',
      category: 'overview'
    },
    {
      key: 'duration',
      label: 'Duration',
      icon: <Clock className="h-4 w-4" />,
      getValue: (course) => course.duration || '—',
      category: 'overview'
    },
    {
      key: 'location',
      label: 'Campus Locations',
      icon: <MapPin className="h-4 w-4" />,
      getValue: (course) => {
        const locations = course.campusLocations || [];
        if (locations.length === 0) return '—';
        if (locations.length <= 2) {
          return locations.join(', ');
        }
        return locations.slice(0, 2).join(', ') + ` +${locations.length - 2} more`;
      },
      category: 'overview'
    },
    {
      key: 'deliveryMode',
      label: 'Delivery Mode',
      icon: <Users className="h-4 w-4" />,
      getValue: (course) => {
        if (!course.deliveryMode) return '—';
        return course.deliveryMode.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      },
      category: 'overview'
    },
    {
      key: 'intake',
      label: 'Intake Dates',
      icon: <Calendar className="h-4 w-4" />,
      getValue: (course) => {
        const intakes = course.intakes || [];
        if (intakes.length === 0) return '—';
        return intakes.slice(0, 3).join(', ') + (intakes.length > 3 ? '...' : '');
      },
      category: 'overview'
    },
    {
      key: 'fees',
      label: 'Tuition Fees',
      icon: <DollarSign className="h-4 w-4" />,
      getValue: (course) => course.fees 
        ? <span className="font-semibold text-primary">{course.currency} {Number(course.fees).toLocaleString()}</span>
        : '—',
      category: 'fees'
    },
    {
      key: 'applicationFees',
      label: 'Application Fee',
      icon: <FileText className="h-4 w-4" />,
      getValue: (course) => {
        if (course.applicationFees === null || course.applicationFees === undefined) return '—';
        if (Number(course.applicationFees) === 0) return <Badge variant="secondary">Waived</Badge>;
        return `${course.currency} ${Number(course.applicationFees).toLocaleString()}`;
      },
      category: 'fees'
    },
    {
      key: 'prPathway',
      label: 'PR Pathway',
      icon: <Award className="h-4 w-4" />,
      getValue: (course) => {
        if (course.prPathway === true) {
          return <Badge className="bg-green-500/10 text-green-600">Yes</Badge>;
        }
        if (course.prPathway === false) {
          return <Badge variant="outline">No</Badge>;
        }
        return '—';
      },
      category: 'fees'
    },
    {
      key: 'englishRequirements',
      label: 'English Requirements',
      icon: <Globe className="h-4 w-4" />,
      getValue: (course) => {
        if (course.englishRequirements) return course.englishRequirements;
        if (course.englishRequirementsStructured?.IELTS) {
          return `IELTS ${course.englishRequirementsStructured.IELTS.overall || '—'}`;
        }
        return '—';
      },
      category: 'requirements'
    },
    {
      key: 'prerequisites',
      label: 'Prerequisites',
      icon: <FileText className="h-4 w-4" />,
      getValue: (course) => course.prerequisites 
        ? <span className="line-clamp-2 text-sm">{course.prerequisites}</span>
        : '—',
      category: 'requirements'
    },
    {
      key: 'careerOutcomes',
      label: 'Career Outcomes',
      icon: <Briefcase className="h-4 w-4" />,
      getValue: (course) => {
        const outcomes = course.careerOutcomes || [];
        if (outcomes.length === 0) return '—';
        return (
          <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
            {outcomes.slice(0, 2).map((outcome, i) => (
              <Badge key={i} variant="outline" className="text-xs whitespace-nowrap max-w-[120px] truncate">{outcome}</Badge>
            ))}
            {outcomes.length > 2 && <span className="text-xs text-muted-foreground whitespace-nowrap">+{outcomes.length - 2} more</span>}
          </div>
        );
      },
      category: 'career'
    },
  ];

  // Group attributes by category
  const categories = [
    { key: 'overview', label: 'Overview', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'fees', label: 'Fees & Scholarships', icon: <DollarSign className="h-4 w-4" /> },
    { key: 'requirements', label: 'Requirements', icon: <FileText className="h-4 w-4" /> },
    { key: 'career', label: 'Career', icon: <Briefcase className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GitCompare className="h-6 w-6 text-primary" />
                Compare Courses
              </h1>
              <p className="text-muted-foreground mt-1">Loading your comparison...</p>
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (courses.length === 0) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-compare">
                <GitCompare className="h-6 w-6 text-primary" />
                Compare Courses
              </h1>
              <p className="text-muted-foreground mt-1">
                Compare courses side-by-side to find the best fit
              </p>
            </div>

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <GitCompare className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No courses selected for comparison
                </h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Browse courses and click the compare checkbox to add courses to your comparison list.
                </p>
                <Button asChild>
                  <Link href="/courses" data-testid="button-browse-courses">
                    <Search className="mr-2 h-4 w-4" />
                    Browse Courses
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-compare">
                <GitCompare className="h-6 w-6 text-primary" />
                Compare Courses
              </h1>
              <p className="text-muted-foreground mt-1">
                Comparing {courses.length} course{courses.length > 1 ? 's' : ''} side-by-side
              </p>
            </div>
            
            {/* Add Course Button with Dialog */}
            <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={courseIds.length >= 4} data-testid="button-add-course">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Course {courseIds.length >= 4 && '(Max 4)'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Add Course to Compare
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search courses by name, institution, or discipline..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                    data-testid="input-search-courses"
                  />
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {availableCourses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No courses found. Try a different search term.
                        </p>
                      ) : (
                        availableCourses.map((course) => (
                          <div 
                            key={course.id}
                            className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                            onClick={() => addCourse(course.id)}
                            data-testid={`course-option-${course.id}`}
                          >
                            {/* Institution Avatar */}
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={course.university?.logo || ''} alt={course.university?.name || ''} />
                              <AvatarFallback className="text-xs bg-primary/10">
                                {course.university?.name?.slice(0, 2).toUpperCase() || 'UN'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{course.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {course.university?.name}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">{course.level}</Badge>
                            </div>
                            <Button size="icon" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table 
              className="w-full border-collapse" 
              style={{ tableLayout: 'fixed', minWidth: courses.length <= 2 ? '100%' : `${160 + courses.length * 240}px` }}
              data-testid="table-comparison"
            >
              <colgroup>
                <col style={{ width: '160px' }} />
                {courses.map((course) => (
                  <col key={course.id} style={{ width: courses.length <= 2 ? `calc((100% - 160px) / ${courses.length})` : '240px' }} />
                ))}
              </colgroup>
              {/* Sticky Course Headers */}
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted p-3 text-left font-semibold border-r">
                    <span className="text-muted-foreground text-sm">Attribute</span>
                  </th>
                  {courses.map((course, index) => (
                    <th 
                      key={course.id} 
                      className={`p-3 text-left align-top ${index < courses.length - 1 ? 'border-r' : ''}`}
                      style={{ backgroundColor: index % 2 === 0 ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--secondary) / 0.05)' }}
                    >
                      <div className="space-y-2">
                        {/* Actions Row */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex flex-wrap gap-1">
                            <Badge className="bg-primary/10 text-primary text-xs">{course.level}</Badge>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Button
                              size="icon"
                              variant={favorites.includes(course.id) ? 'default' : 'ghost'}
                              className={favorites.includes(course.id) ? 'bg-red-500 text-white' : ''}
                              onClick={() => toggleFavorite(course.id)}
                              data-testid={`button-favorite-${course.id}`}
                            >
                              <Heart className={`h-4 w-4 ${favorites.includes(course.id) ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeCourse(course.id)}
                              data-testid={`button-remove-${course.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Course Title */}
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`course-title-${course.id}`}>
                          {course.title}
                        </h3>
                        
                        {/* Institution Link with Avatar */}
                        {course.university && (
                          <Link 
                            href={`/institutions/${course.universityId}`}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Avatar className="h-5 w-5 flex-shrink-0">
                              <AvatarImage src={course.university.logo || ''} alt={course.university.name} />
                              <AvatarFallback className="text-[8px] bg-primary/10">
                                {course.university.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{course.university.name}</span>
                          </Link>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              {/* Comparison Rows by Category */}
              <tbody>
                {categories.map((category) => {
                  const categoryAttributes = comparisonAttributes.filter(attr => attr.category === category.key);
                  if (categoryAttributes.length === 0) return null;
                  
                  return (
                    <React.Fragment key={category.key}>
                      {/* Category Header Row */}
                      <tr className="bg-muted/30">
                        <td className="sticky left-0 z-10 bg-muted px-3 py-1.5 font-semibold text-xs border-r">
                          <div className="flex items-center gap-1.5 text-foreground">
                            {category.icon}
                            {category.label}
                          </div>
                        </td>
                        <td colSpan={courses.length} className="bg-muted/30 px-3 py-1.5" />
                      </tr>
                      
                      {/* Attribute Rows */}
                      {categoryAttributes.map((attr, attrIndex) => (
                        <tr 
                          key={attr.key} 
                          className={`${attrIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'} hover:bg-muted/20 transition-colors`}
                        >
                          <td className="sticky left-0 z-10 px-3 py-2 border-r font-semibold text-xs bg-muted">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">{attr.icon}</span>
                              <span className="truncate">{attr.label}</span>
                            </div>
                          </td>
                          {courses.map((course, courseIndex) => (
                            <td 
                              key={course.id} 
                              className={`px-3 py-2 text-xs ${courseIndex < courses.length - 1 ? 'border-r' : ''}`}
                              data-testid={`cell-${attr.key}-${course.id}`}
                            >
                              {attr.getValue(course)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                
                {/* Action Buttons Row */}
                <tr className="bg-muted/30">
                  <td className="sticky left-0 z-10 px-3 py-2 border-r bg-muted font-medium text-xs">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Actions</span>
                    </div>
                  </td>
                  {courses.map((course, index) => (
                    <td key={course.id} className={`px-3 py-2 ${index < courses.length - 1 ? 'border-r' : ''}`}>
                      <div className="flex flex-col gap-1.5">
                        <Button asChild size="sm" className="w-full text-xs">
                          <Link href={`/courses/${course.id}`} data-testid={`button-view-${course.id}`}>
                            <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                            View Details
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="w-full text-xs">
                          <Link href={`/courses/${course.id}#apply`} data-testid={`button-apply-${course.id}`}>
                            <Mail className="mr-1.5 h-3.5 w-3.5" />
                            Request Info
                          </Link>
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Add More Prompt (if less than 2 courses) */}
          {courses.length === 1 && (
            <Card className="border-dashed border-2 border-primary/30">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Plus className="h-10 w-10 text-primary/50 mb-3" />
                <h3 className="font-semibold mb-1">Add another course to compare</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need at least 2 courses for a side-by-side comparison
                </p>
                <Button variant="outline" onClick={() => setAddCourseDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Course
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Click the heart to save favorites</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              <span>Click X to remove from comparison</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Compare up to 4 courses at once</span>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
