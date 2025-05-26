                        // src/pages/wedding/WeddingInquiryFormFixed.tsx
                        import React, { useState } from "react";
                        import { useForm, FormProvider } from "react-hook-form";
                        import { Helmet } from "react-helmet";

                        // Import UI Components
                        import { Button } from "@/components/ui/button";
                        import { Card, CardContent } from "@/components/ui/card";
                        import { ChevronRight, ChevronLeft } from "lucide-react";

                        // Import ALL step components
                        import WeddingBasicInformationStep from "./components/WeddingBasicInformationStepClean";
                        import WeddingEventDetailsStep from "./components/WeddingEventDetailsStep";
                        import WeddingServiceStyleStep from "./components/WeddingServiceStyleStep";
                        import WeddingMenuSelectionStep from "./components/WeddingMenuSelectionStep";
                        import WeddingAppetizerQuestionStep from "./components/WeddingAppetizerQuestionStep";
                        import WeddingAppetizersStep from "./components/WeddingAppetizersStep";
                        import WeddingFoodTruckMenuStep from "./components/WeddingFoodTruckMenuStep";
                        import WeddingSandwichFactoryMenuStep from "./components/WeddingSandwichFactoryMenuStep";
                        import WeddingBreakfastMenuStep from "./components/WeddingBreakfastMenuStep";
                        import WeddingDessertQuestionStep from "./components/WeddingDessertQuestionStep";
                        import WeddingDessertsStep from "./components/WeddingDessertsStep";
                        import WeddingBeverageQuestionStep from "./components/WeddingBeverageQuestionStep";
                        import WeddingNonAlcoholicBeveragesStep from "./components/WeddingNonAlcoholicBeveragesStep";
                        import WeddingAlcoholicBeveragesStep from "./components/WeddingAlcoholicBeveragesStep";
                        import WeddingEquipmentQuestionStep from "./components/WeddingEquipmentQuestionStep";
                        import WeddingEquipmentStep from "./components/WeddingEquipmentStep";
                        import WeddingDietaryRestrictionsStep from "./components/WeddingDietaryRestrictionsStep";

                        // Import Wedding-Specific Types
                        import {
                          WeddingInquiryFormData,
                          WeddingFormStep,
                          EventType as LocalEventType, 
                        } from "./types/weddingFormTypes";

                        // --- Helper Components (Progress Bar, Header) ---
                        const WeddingFormHeader = () => {
                          return (
                            <div className="relative w-full min-h-[400px] overflow-hidden mb-8">
                              {/* Background with gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50"></div>

                              {/* Decorative floating elements */}
                              <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute top-10 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-20 animate-pulse"></div>
                                <div className="absolute top-32 right-20 w-16 h-16 bg-rose-300 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '1s' }}></div>
                                <div className="absolute bottom-20 left-32 w-12 h-12 bg-purple-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2s' }}></div>
                                <div className="absolute bottom-40 right-10 w-24 h-24 bg-pink-100 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                              </div>

                              {/* Subtle pattern overlay */}
                              <div className="absolute inset-0 opacity-5" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23db2777' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm10 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                              }}></div>

                              {/* Content */}
                              <div className="relative z-10 container mx-auto px-6 py-16 text-center">
                                <div className="max-w-4xl mx-auto">
                                  {/* Main headline with romantic typography */}
                                  <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-800 leading-tight">
                                    <span className="font-serif italic text-rose-600">Your</span>{' '}
                                    <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Dream Wedding</span>
                                    <br />
                                    <span className="text-4xl md:text-5xl font-light text-gray-700">Awaits</span>
                                  </h1>

                                  {/* Elegant tagline */}
                                  <div className="mb-8">
                                    <p className="text-2xl md:text-3xl font-serif italic text-rose-500 mb-2">
                                      "Creating magical moments, one bite at a time"
                                    </p>
                                    <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent mx-auto"></div>
                                  </div>

                                  {/* Description */}
                                  <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
                                    From intimate gatherings to grand celebrations, our expert culinary team crafts 
                                    unforgettable dining experiences that perfectly complement your love story.
                                  </p>

                                  {/* Trust indicators */}
                                  <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                      <div className="flex text-yellow-400">
                                      </div>
                                      <span></span>
                                    </div>
                                    <div className="h-4 w-px bg-gray-300"></div>
                                    <span></span>
                                    <div className="h-4 w-px bg-gray-300"></div>
                                    <span></span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom decorative wave */}
                              <div className="absolute bottom-0 left-0 w-full">
                                <svg className="w-full h-12 text-white" preserveAspectRatio="none" viewBox="0 0 1200 120" fill="currentColor">
                                  <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
                                  <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
                                  <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
                                </svg>
                              </div>
                            </div>
                          );
                        };

                        const FormProgressBar = ({
                          currentStepNumber,
                          totalSteps,
                          currentStepKey,
                        }: {
                          currentStepNumber: number;
                          totalSteps: number;
                          currentStepKey: string;
                        }) => {
                          const progressPercentage = totalSteps > 0 ? (currentStepNumber / totalSteps) * 100 : 0;
                          const formatStepName = (key: string) => {
                            if (key === "serviceStyleSelection") return "Service Style";
                            return key
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase());
                          };
                          const stepName = formatStepName(currentStepKey);

                          return (
                            <div className="w-full mb-8">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Step {currentStepNumber} of {totalSteps}: {stepName}
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                  {Math.floor(progressPercentage)}% Complete
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-pink-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                                  style={{ width: `${progressPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        };

                        // Main Wedding Inquiry Form Component
                        export default function WeddingInquiryFormFixed() {
                          const methods = useForm<WeddingInquiryFormData>({
                            defaultValues: {
                              eventType: "Wedding",
                              billingAddress: {
                                street: "",
                                city: "",
                                state: "",
                                zipCode: "",
                              },
                              contactName: {
                                firstName: "",
                                lastName: "",
                              },
                              email: "",
                              phone: "",
                              eventDate: "",
                              hasPromoCode: false,
                              venueSecured: false,
                              hasCocktailHour: false,
                              hasMainCourse: true,
                              guestCount: 50,
                              serviceStyle: "",
                              requestedTheme: "",
                              menuSelections: {
                                proteins: [],
                                sides: [],
                                salads: [],
                                salsas: [],
                                desserts: [],
                                addons: []
                              },
                              wantsAppetizers: false,
                              appetizers: {
                                tea_sandwiches: [],
                                shooters: [],
                                canapes: [],
                                spreads: []
                              },
                              appetizerService: "stationary",
                              horsDoeurvesSelections: {
                                serviceStyle: "stationary",
                                categories: {}
                              },
                              dessertSelections: {},
                              servingAlcohol: [],
                              additionalCocktails: false,
                              alcoholTypes: [],
                              wantsFurniture: false,
                              furniture: [],
                              hasVeggieFriendlyOption: false,
                              vegetarian: [],
                              hasVeganFriendlyOption: false,
                              vegan: []
                            }
                          });

                          const { watch, setValue, getValues } = methods;
                          const [currentStepKey, setCurrentStepKey] = useState<WeddingFormStep>("basicInformation");

                          // Define the order of wedding form steps
                          const weddingSteps: WeddingFormStep[] = [
                            "basicInformation",
                            "eventDetails",
                            "serviceStyleSelection",
                            "menuSelection",
                            "appetizerQuestion",
                            "appetizers",
                            "dessertQuestion",
                            "desserts",
                            "beverageQuestion",
                            "nonAlcoholicBeverages",
                            "alcoholicBeverages",
                            "equipmentQuestion",
                            "equipment",
                            "dietaryRestrictions"
                          ];

                          const currentStepNumber = weddingSteps.indexOf(currentStepKey) + 1;
                          const totalSteps = weddingSteps.length;

                          const handleNextStep = () => {
                            const currentIndex = weddingSteps.indexOf(currentStepKey);
                            if (currentIndex < weddingSteps.length - 1) {
                              setCurrentStepKey(weddingSteps[currentIndex + 1]);
                            }
                          };

                          const handlePreviousStep = () => {
                            const currentIndex = weddingSteps.indexOf(currentStepKey);
                            if (currentIndex > 0) {
                              setCurrentStepKey(weddingSteps[currentIndex - 1]);
                            }
                          };

                          const renderCurrentStep = () => {
                            const commonProps = {
                              onNext: handleNextStep,
                              onPrevious: handlePreviousStep,
                            };

                            switch (currentStepKey) {
                              case "basicInformation":
                                return <WeddingBasicInformationStep {...commonProps} />;
                              case "eventDetails":
                                return <WeddingEventDetailsStep {...commonProps} />;
                              case "serviceStyleSelection":
                                return <WeddingServiceStyleStep {...commonProps} />;
                              case "menuSelection":
                                const selectedTheme = watch("requestedTheme") || "";
                                const guestCount = watch("guestCount") || 50;
                                return (
                                  <WeddingMenuSelectionStep
                                    selectedTheme={selectedTheme}
                                    guestCount={guestCount}
                                    {...commonProps}
                                  />
                                );
                              default:
                                return <div>Step not implemented</div>;
                            }
                          };

                          return (
                            <>
                              <Helmet>
                                <title>Wedding Catering Inquiry | Home Bites Catering Services</title>
                                <meta name="description" content="Plan your dream wedding with our expert catering services. From intimate gatherings to grand celebrations, we create unforgettable dining experiences." />
                              </Helmet>

                              <div className="min-h-screen bg-gray-50">
                                <WeddingFormHeader />

                                <FormProvider {...methods}>
                                  <form className="container mx-auto px-4 max-w-4xl">
                                    <FormProgressBar
                                      currentStepNumber={currentStepNumber}
                                      totalSteps={totalSteps}
                                      currentStepKey={currentStepKey}
                                    />

                                    {renderCurrentStep()}
                                  </form>
                                </FormProvider>
                              </div>
                            </>
                          );
                        }