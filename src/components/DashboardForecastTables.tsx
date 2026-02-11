import { motion } from 'framer-motion';
import { TrendingUp, CalendarRange, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function DashboardForecastTables() {
  const {
    monthlyTotals2026,
    yearTotal2026,
    monthlyTotals2027,
    yearTotal2027,
    rollingMonthlyTotals,
    rollingTotal,
  } = useProjectDataContext();

  return (
    <div className="space-y-6">
      {/* 2026 Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Försäljningsprognos 2026
              <span className="ml-auto text-xl font-bold text-primary">{yearTotal2026.toFixed(1)} MSEK</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    {months.map(m => (
                      <TableHead key={m} className="text-center font-semibold min-w-[60px]">{m}</TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-muted/30 min-w-[80px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-border/50">
                    {months.map(m => (
                      <TableCell key={m} className="text-center font-medium">
                        {(monthlyTotals2026[m] || 0) > 0
                          ? (monthlyTotals2026[m]).toFixed(1)
                          : <span className="text-muted-foreground/30">-</span>
                        }
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-primary bg-muted/30">
                      {yearTotal2026.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Rolling 12 months Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarRange className="h-5 w-5 text-primary" />
              Rullande 12 månader
              <span className="ml-auto text-xl font-bold text-primary">{rollingTotal.toFixed(1)} MSEK</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    {rollingMonthlyTotals.map(rm => (
                      <TableHead key={rm.label} className="text-center font-semibold min-w-[70px]">
                        <div className="flex flex-col items-center">
                          <span>{rm.month}</span>
                          <span className="text-xs text-muted-foreground">{rm.year}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-muted/30 min-w-[80px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-border/50">
                    {rollingMonthlyTotals.map(rm => (
                      <TableCell key={rm.label} className="text-center font-medium">
                        {rm.total > 0
                          ? rm.total.toFixed(1)
                          : <span className="text-muted-foreground/30">-</span>
                        }
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-primary bg-muted/30">
                      {rollingTotal.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2027 Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              Försäljningsprognos 2027
              <span className="ml-auto text-xl font-bold text-primary">{yearTotal2027.toFixed(1)} MSEK</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    {months.map(m => (
                      <TableHead key={m} className="text-center font-semibold min-w-[60px]">{m}</TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-muted/30 min-w-[80px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-border/50">
                    {months.map(m => (
                      <TableCell key={m} className="text-center font-medium">
                        {(monthlyTotals2027[m] || 0) > 0
                          ? (monthlyTotals2027[m]).toFixed(1)
                          : <span className="text-muted-foreground/30">-</span>
                        }
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-primary bg-muted/30">
                      {yearTotal2027.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
