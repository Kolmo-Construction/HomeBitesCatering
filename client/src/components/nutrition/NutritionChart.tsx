import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Sector
} from 'recharts';

interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutritionChartProps {
  nutritionData: NutritionalInfo;
  height?: number;
  chartType?: 'bar' | 'pie';
}

const NutritionChart: React.FC<NutritionChartProps> = ({ 
  nutritionData, 
  height = 250,
  chartType = 'pie'
}) => {
  // Format the data for the recharts component
  const macroData = [
    {
      name: 'Protein',
      grams: nutritionData.protein,
      calories: nutritionData.protein * 4, // 4 calories per gram of protein
      fill: '#8884d8'
    },
    {
      name: 'Carbs',
      grams: nutritionData.carbs,
      calories: nutritionData.carbs * 4, // 4 calories per gram of carbs
      fill: '#82ca9d'
    },
    {
      name: 'Fat',
      grams: nutritionData.fat,
      calories: nutritionData.fat * 9, // 9 calories per gram of fat
      fill: '#ffc658'
    },
    {
      name: 'Fiber',
      grams: nutritionData.fiber,
      calories: 0, // Fiber doesn't contribute to calories
      fill: '#ff8042'
    }
  ];

  // Calculate the percentage of calories from each macronutrient
  const totalCalories = nutritionData.calories;
  
  const pieData = [
    {
      name: 'Protein',
      value: Math.round((nutritionData.protein * 4 / totalCalories) * 100),
      fill: '#8884d8'
    },
    {
      name: 'Carbs',
      value: Math.round((nutritionData.carbs * 4 / totalCalories) * 100),
      fill: '#82ca9d'
    },
    {
      name: 'Fat',
      value: Math.round((nutritionData.fat * 9 / totalCalories) * 100),
      fill: '#ffc658'
    }
  ];

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={macroData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip 
          formatter={(value: number, name: string) => [
            `${value}${name === 'calories' ? ' kcal' : 'g'}`, 
            name.charAt(0).toUpperCase() + name.slice(1)
          ]} 
        />
        <Legend />
        <Bar dataKey="grams" fill="#8884d8" name="Grams" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}%`}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [`${value}%`, 'Percentage']} 
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  // Show a no data message if there's no nutritional data
  if (totalCalories === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] bg-gray-50 rounded-lg border">
        <p className="text-gray-500">Select menu items to view nutritional data</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium mb-3">Macronutrient Distribution</h3>
      <div className="mb-2 text-sm text-center text-gray-500">
        {totalCalories > 0 ? (
          <p>Total Calories: {totalCalories} kcal</p>
        ) : (
          <p>No nutrition data available</p>
        )}
      </div>
      
      {chartType === 'bar' ? renderBarChart() : renderPieChart()}
    </div>
  );
};

export default NutritionChart;