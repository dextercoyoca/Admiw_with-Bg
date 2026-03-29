import React, { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

interface Bill {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue" | string;
  dueDate: string;
  issueDate: string;
  description: string;
}

export default function Bills() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");

  const bills: Bill[] = [
    {
      id: "1",
      invoiceNumber: "INV-2026-001",
      customerName: "John Doe",
      customerEmail: "john.doe@example.com",
      amount: 99.99,
      status: "Paid",
      dueDate: "2026-03-15",
      issueDate: "2026-03-01",
      description: "Premium Subscription - March 2026",
    },
    {
      id: "2",
      invoiceNumber: "INV-2026-002",
      customerName: "Jane Smith",
      customerEmail: "jane.smith@example.com",
      amount: 49.99,
      status: "Pending",
      dueDate: "2026-03-20",
      issueDate: "2026-03-05",
      description: "Basic Plan - March 2026",
    },
    {
      id: "3",
      invoiceNumber: "INV-2026-003",
      customerName: "Mike Johnson",
      customerEmail: "mike.johnson@example.com",
      amount: 149.99,
      status: "Overdue",
      dueDate: "2026-02-28",
      issueDate: "2026-02-15",
      description: "Pro Plan - February 2026",
    },
    {
      id: "4",
      invoiceNumber: "INV-2026-004",
      customerName: "Sarah Wilson",
      customerEmail: "sarah.wilson@example.com",
      amount: 199.99,
      status: "Paid",
      dueDate: "2026-03-10",
      issueDate: "2026-02-25",
      description: "Enterprise Plan - March 2026",
    },
  ];

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "All" || bill.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: "Paid" | "Pending" | "Overdue" | string): string => {
    switch (status) {
      case "Paid":
        return "#28A745";
      case "Pending":
        return "#FFC107";
      case "Overdue":
        return "#DC3545";
      default:
        return "#6C757D";
    }
  };

  const renderBill = ({ item }: { item: Bill }) => (
    <TouchableOpacity
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
      onPress={() => {
        // Navigate to bill details
        console.log("View bill details:", item.id);
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: "#333",
              marginBottom: 4,
            }}
          >
            {item.invoiceNumber}
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 2 }}>
            {item.customerName}
          </Text>
          <Text style={{ fontSize: 12, color: "#999" }}>
            {item.customerEmail}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#333",
              marginBottom: 4,
            }}
          >
            ${item.amount.toFixed(2)}
          </Text>
          <View
            style={{
              backgroundColor: getStatusColor(item.status),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={{
          fontSize: 14,
          color: "#666",
          marginBottom: 8,
          lineHeight: 20,
        }}
      >
        {item.description}
      </Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 12, color: "#999" }}>
          Issued: {item.issueDate}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: item.status === "Overdue" ? "#DC3545" : "#999",
            fontWeight: item.status === "Overdue" ? "600" : "normal",
          }}
        >
          Due: {item.dueDate}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const billStats = {
    total: bills.length,
    paid: bills.filter((b) => b.status === "Paid").length,
    pending: bills.filter((b) => b.status === "Pending").length,
    overdue: bills.filter((b) => b.status === "Overdue").length,
    totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#0066CC",
          paddingTop: 50,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>
          Customer Bills
        </Text>
        <TouchableOpacity>
          <MaterialIcons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Search Bar */}
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            placeholder="Search bills..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: 16,
              color: "#333",
            }}
          />
        </View>

        {/* Stats Cards */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginRight: 8,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#28A745" }}>
              ${billStats.totalAmount.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>Total Billed</Text>
          </View>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              flex: 1,
              marginLeft: 8,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#DC3545" }}>
              {billStats.overdue}
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>Overdue</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "white",
            borderRadius: 12,
            padding: 4,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          {["All", "Paid", "Pending", "Overdue"].map((status) => (
            <TouchableOpacity
              key={status}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: "center",
                backgroundColor:
                  filterStatus === status ? "#0066CC" : "transparent",
                borderRadius: 8,
              }}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={{
                  color: filterStatus === status ? "white" : "#666",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bills List */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#333",
            marginBottom: 16,
          }}
        >
          Bills ({filteredBills.length})
        </Text>
        <FlatList
          data={filteredBills}
          renderItem={renderBill}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </ScrollView>
    </View>
  );
}