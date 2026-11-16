# Generates the synthetic Halyard data room. Everything here is fictional.
import csv, random, os
random.seed(7)
out = os.path.join(os.path.dirname(__file__), "..", "rooms", "halyard")
pre = ["Pelican","Northwind","Bluefin","Saltmarsh","Ironkeel","Tidewater","Cormorant","Bayline","Harborlight","Seaforth",
       "Gullwing","Anchorpoint","Driftwood","Kestrel","Marlinspike","Stormgate","Coldwater","Lighthouse","Portside","Wavecrest",
       "Sandbar","Riptide","Ospreyline","Breakwater","Fathom","Starboard","Leeward","Mooring","Galleon","Shoalhaven",
       "Corsair","Skerry","Brightwater","Halcyon"]
suf = ["Freight","Shipping Co.","Marine","Logistics","Lines","Terminals","Maritime","Ferries","Cargo","Port Services"]
rows=[]
for i,p in enumerate(pre):
    seg = "Enterprise" if i < 26 else "Mid-Market"
    start = random.randint(60,180)*1000 if seg=="Enterprise" else random.randint(18,45)*1000
    status = "active"
    if i in (4,11,19): status="churned"
    if i < 23: pass
    if seg=="Enterprise" and i>=23: status="churned" if i in (23,24) else "active"
    growth = random.choice([0.95,1.0,1.05,1.1,1.15,1.2,1.3,1.4,1.6])
    now = 0 if status=="churned" else round(start*growth/1000)*1000
    rows.append(dict(customer=f"{p} {random.choice(suf)}", segment=seg, contract_start=f"202{random.choice([3,4,4,5])}-{random.randint(1,12):02d}",
                     arr_jan_2026=start, arr_oct_2026=now, status=status, champion=f"{random.choice(['Dana','Luis','Priya','Tom','Mei','Sam','Ines','Kofi','Rae','Omar'])} {random.choice(['Ortiz','Chen','Walsh','Okafor','Silva','Novak','Haas','Reyes'])}"))
with open(os.path.join(out,"customers.csv"),"w",newline="") as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
ent_active=sum(1 for r in rows if r["segment"]=="Enterprise" and r["status"]=="active")
arr=sum(r["arr_oct_2026"] for r in rows); arr0=sum(r["arr_jan_2026"] for r in rows)
print("enterprise active",ent_active,"arr_oct",arr,"arr_jan",arr0,"nrr",round(arr/arr0*100,1))

# P&L consistent with customer ARR
months=["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"]
with open(os.path.join(out,"pnl_2026.csv"),"w",newline="") as f:
    w=csv.writer(f); w.writerow(["month","revenue","cogs","gross_margin_pct","rnd","sales_marketing","g_and_a","net_income"])
    for k,m in enumerate(months):
        mrr=round((arr0+(arr-arr0)*k/9)/12)
        cogs=round(mrr*0.24); rnd=158000+k*2500; sm=121000+k*3000; ga=64000
        w.writerow([m,mrr,cogs,round((mrr-cogs)/mrr*100,1),rnd,sm,ga,mrr-cogs-rnd-sm-ga])

# Payroll
first=["Ava","Ben","Caro","Dev","Eli","Fay","Gus","Hana","Ivo","Jun","Kai","Lena","Milo","Nia","Otto","Pia","Quin","Rui"]
last=["Abara","Brandt","Costa","Dahl","Eze","Fischer","Grau","Hale","Ito","Juarez","Kim","Lund","Moreau","Nash","Oyelaran","Park","Qadir","Ruiz"]
depts=[("Engineering",8,(165000,235000)),("Sales",4,(120000,190000)),("Customer Success",3,(95000,130000)),("G&A",3,(110000,260000))]
with open(os.path.join(out,"payroll.csv"),"w",newline="") as f:
    w=csv.writer(f); w.writerow(["employee","department","title","base_salary","equity_pct"]); n=0
    for d,c,(lo,hi) in depts:
        for j in range(c):
            w.writerow([f"{first[n]} {last[n]}",d,{"Engineering":"Software Engineer","Sales":"Account Executive","Customer Success":"CS Manager","G&A":"Operations"}[d] if j else f"Head of {d}",random.randint(lo//1000,hi//1000)*1000,round(random.uniform(0.05,1.5),2)]); n+=1

# Cap table
with open(os.path.join(out,"cap_table.csv"),"w",newline="") as f:
    w=csv.writer(f); w.writerow(["holder","holder_type","share_class","shares"])
    for r in [("Marisol Vega","Founder","Common",3200000),("Theo Lindqvist","Founder","Common",2900000),("Employee option pool","Pool","Options",1400000),
              ("Brine Capital","Investor","Series Seed",1650000),("Keelhaul Ventures","Investor","Series Seed",820000),("Angel syndicate (11 holders)","Investor","Series Seed",410000),
              ("Coastline Partners","Investor","Series A",2100000)]:
        w.writerow(r)
