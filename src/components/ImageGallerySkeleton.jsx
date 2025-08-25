import React from "react";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

const ImageGallerySkeleton = ({ count = 10 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              {/* Image skeleton */}
              <Skeleton className="w-full aspect-[4/3]" />
              
              {/* Badge skeleton */}
              <div className="absolute top-2 left-2">
                <Skeleton className="h-5 w-16" />
              </div>
              
              {/* Menu button skeleton */}
              <div className="absolute top-2 right-2">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ImageGallerySkeleton;
